import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import cors from 'cors';
import { Logger } from 'winston';

import { config } from './config';
import { authMiddleware } from './authMiddleware';
import { prometheusMiddleware } from './prometheusMiddleware';
import { ApiRequestFilter } from './types';
import { Vault } from './Vault';
import { Response } from './Response';
import { errorMiddleware } from './errorMiddleware';
import { validateBody, validatePagination, validateQuery } from './validations';
import { CreateEvidence } from './actions/CreateEvidence';
import { RetrieveEvidence } from './actions/RetrieveEvidence';
import { RetrieveUserEvidences } from './actions/RetrieveUserEvidences';

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
      const action = new CreateEvidence(vault, logger);
      const evidence = await action.execute(req.body.url, req.user, req.body.cookies);

      res.status(202);
      res.json({
        data: Response(evidence),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/evidences', async (req: ApiRequestFilter, res, next) => {
    try {
      validateQuery(req);
      validatePagination(req);

      const action = new RetrieveUserEvidences(vault);
      const evidences = await action.execute(req.user, req.query);

      res.json({
        data: evidences.map(Response),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/evidences/:id', async (req, res, next) => {
    try {
      const action = new RetrieveEvidence(vault);
      const evidence = await action.execute(req.params.id, req.user);

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
      const action = new RetrieveEvidence(vault);
      const evidence = await action.execute(req.params.id, req.user);

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
