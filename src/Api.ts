import express from 'express';
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

type status = 'SCHEDULED' | 'PROCESSING' | 'PROCESSED';

export type EvidenceBase = {
  attributes: {
    status: status;
    url: string;
    downloads: { path: string; type: string }[];
  };
};

export type Evidence = EvidenceBase & { id: string };
export type EvidenceDB = EvidenceBase & { _id: ObjectId; attributes: { user: ObjectId } };

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

  app.get('/api/evidences', async (req, res) => {
    res.json({
      data: (await vault.getByUser(req.user)).map(Response),
    });
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
