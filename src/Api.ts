import express, { Request } from 'express';
import bodyParser from 'body-parser';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

import { ObjectId } from 'mongodb';
import path from 'path';
import { config } from './config';
import { authMiddleware } from './authMiddleware';
import { prometheusMiddleware } from './prometheusMiddleware';
import { Vault } from './Vault';
import { Response } from './Response';
import { errorMiddleware } from './errorMiddleware';
import { Logger } from 'winston';
import { validateBody, validatePagination, validateQuery } from './validations';
import { status } from './QueueProcessor';
import cors from 'cors';
import { PreserveEvidence } from './actions/PreserveEvidence';

export interface ApiRequestFilter extends Request {
  query: {
    filter?: {
      date: { gt: string };
      status: status;
    };
    page?: {
      limit: string;
    };
  };
}

const Api = (vault: Vault, logger: Logger) => {
  const app = express();

  if (config.sentry.api_dsn) {
    Sentry.init({
      release: config.VERSION,
      dsn: config.sentry.api_dsn,
      environment: config.ENVIRONMENT,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Tracing.Integrations.Express({ app }),
        new Tracing.Integrations.Mongo({
          useMongoose: false,
        }),
      ],
      tracesSampleRate: config.sentry.tracesSampleRate,
    });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  app.use(cors());
  app.use(prometheusMiddleware);
  app.use(bodyParser.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/error', () => {
    throw new Error('Intentionally thrown error');
  });

  app.use(authMiddleware);

  app.post('/api/evidences', async (req, res, next) => {
    try {
      validateBody(req.body);
      const action = new PreserveEvidence(vault);
      res.status(202);
      res.json({
        data: Response(await action.execute(req.body.url, req.user)),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/evidences', async (req: ApiRequestFilter, res, next) => {
    try {
      validateQuery(req);
      validatePagination(req);

      const dateFilter = req.query.filter?.date?.gt
        ? {
            'attributes.date': { $gt: new Date(req.query.filter?.date?.gt) },
          }
        : {};
      const statusFilter = req.query.filter?.status
        ? {
            'attributes.status': req.query.filter.status,
          }
        : {};
      res.json({
        data: (
          await vault.getByUser(
            req.user,
            {
              ...dateFilter,
              ...statusFilter,
            },
            req.query?.page?.limit ? parseInt(req.query.page.limit) : undefined
          )
        ).map(Response),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/evidences/:id', async (req, res, next) => {
    try {
      const evidence = await vault.getOne(new ObjectId(req.params.id), req.user);
      if (evidence) {
        res.status(200);
        res.json({
          data: Response(evidence),
        });
      } else {
        res.status(404);
        res.json({});
      }
    } catch (error) {
      next(error);
    }
  });

  app.get('/evidences/:id/:filename', async (req, res, next) => {
    try {
      const evidence = await vault.getOne(new ObjectId(req.params.id), req.user);
      if (evidence) {
        res.status(200);
        res.sendFile(path.resolve(`${config.data_path}/${req.params.id}/${req.params.filename}`));
      } else {
        res.status(404);
        res.end();
      }
    } catch (error) {
      next(error);
    }
  });

  if (config.sentry.api_dsn) {
    app.use(Sentry.Handlers.errorHandler());
  }

  app.use(errorMiddleware(logger));

  return app;
};

export { Api };
