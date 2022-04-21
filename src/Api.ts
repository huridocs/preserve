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

export interface ApiRequestFilter extends Request {
  query: {
    filter?: {
      date: { gt: string };
    };
  };
}

const Api = (vault: Vault) => {
  const app = express();

  app.use(prometheusMiddleware);

  if (config.sentry.dsn) {
    Sentry.init({
      release: config.VERSION,
      dsn: config.sentry.dsn,
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
    app.use(Sentry.Handlers.errorHandler());
  }

  app.use(bodyParser.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(authMiddleware);

  const validateQuery = (request?: ApiRequestFilter): boolean => {
    if (!request?.query?.filter) {
      return true;
    }

    if (request?.query?.filter.date) {
      return true;
    }
    return false;
  };

  const validateBody = (body: any): boolean => {
    if (typeof body.url !== 'string') {
      return false;
    }
    return true;
  };

  app.post('/api/evidences', async (req, res) => {
    if (!validateBody(req.body)) {
      res.status(400);
      res.json({ errors: ['url should exist and be a string'] });
    } else {
      res.status(202);
      res.json({
        data: Response(await vault.create(req.body.url, req.user)),
      });
    }
  });

  app.get('/api/evidences', async (req: ApiRequestFilter, res) => {
    if (!validateQuery(req)) {
      res.status(400);
      res.json({ errors: ['only filter[date][gt]= is accepted as filter'] });
    } else {
      res.json({
        data: (
          await vault.getByUser(
            req.user,
            req.query.filter?.date?.gt
              ? {
                  'attributes.date': { $gt: new Date(req.query.filter?.date?.gt) },
                }
              : {}
          )
        ).map(Response),
      });
    }
  });

  app.get('/api/evidences/:id', async (req, res) => {
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
  });

  app.get('/evidences/:id/:filename', async (req, res) => {
    const evidence = await vault.getOne(new ObjectId(req.params.id), req.user);
    if (evidence) {
      res.status(200);
      res.sendFile(path.resolve(`${config.data_path}/${req.params.id}/${req.params.filename}`));
    } else {
      res.status(404);
      res.end();
    }
  });

  return app;
};

export { Api };
