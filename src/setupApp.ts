import express from 'express';
import promBundle from 'express-prom-bundle';
import bodyParser from 'body-parser';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

import { Collection, Db, ObjectId } from 'mongodb';
import { authMiddleware } from './authMiddleware';
import path from 'path';
import { config } from './config';

let resolvePromise: (value: unknown) => void;

const timeout = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

type status = 'SCHEDULED' | 'PROCESSING' | 'PROCESSED';

export type PreservationBase = {
  attributes: {
    status: status;
    url: string;
    content?: string;
    downloads?: {
      screenshots?: Array<string>;
      video?: string;
    };
  };
};

export type Preservation = PreservationBase & { id: string };
export type PreservationDB = PreservationBase & { _id: ObjectId; attributes: { user: ObjectId } };

let preservations: Collection<PreservationDB>;

export type JobResults = {
  content?: string;
  downloads?: {
    screenshots?: Array<string>;
    video?: string;
  };
};

export type JobFunction = (preservation: PreservationDB) => Promise<JobResults>;

const processJobs = async (job: JobFunction, interval = 1000) => {
  while (!resolvePromise) {
    await timeout(interval);

    const preservation = (
      await preservations.findOneAndUpdate(
        { 'attributes.status': 'SCHEDULED' },
        { $set: { 'attributes.status': 'PROCESSING' } }
      )
    ).value;

    if (preservation) {
      const preservationMetadata = await job(preservation);
      await preservations.updateOne(
        { _id: preservation._id },
        {
          $set: {
            attributes: {
              ...preservation.attributes,
              ...preservationMetadata,
              status: 'PROCESSED',
            },
          },
        }
      );
    }
  }
  resolvePromise(1);
};

const setupApp = (db: Db) => {
  preservations = db.collection<PreservationDB>('preservations');

  const app = express();

  const metricsMiddleware = promBundle({
    includeMethod: true,
    includePath: true,
    customLabels: {
      port: config.PORT,
      env: config.ENVIRONMENT,
    },
    promClient: {
      collectDefaultMetrics: {},
    },
  });

  app.use(metricsMiddleware);

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

  const validateBody = (body: any): { url: string } => {
    if (typeof body.url === 'string') {
      return { url: body.url };
    }
    throw new Error('url should exist and be a string');
  };

  app.post('/api/preservations', async (req, res) => {
    try {
      const body = validateBody(req.body);
      res.status(202);
      const id = new ObjectId();

      const attributes = {
        url: body.url,
        user: req.user._id,
        status: 'SCHEDULED',
      };

      await preservations.insertOne({
        _id: id,
        attributes: {
          url: body.url,
          user: req.user._id,
          status: 'SCHEDULED',
        },
      });

      res.json({
        id: id,
        data: { attributes },
        links: {
          self: `/api/preservations/${id}`,
        },
      });
    } catch (e) {
      res.status(400);
      res.end();
    }
  });

  app.get('/api/preservations', async (req, res) => {
    res.json({
      data: (await preservations.find({ 'attributes.user': req.user._id }).toArray()).map(p => {
        return { id: p._id, ...p, _id: undefined };
      }),
    });
  });

  app.get('/api/preservations/:id', async (req, res) => {
    const preservation = await preservations.findOne(
      {
        _id: new ObjectId(req.params.id),
        'attributes.user': req.user._id,
      },
      { projection: { attributes: 1, _id: 1 } }
    );

    res.status(preservation ? 200 : 404);
    res.json({
      data: preservation ? { id: preservation._id, ...preservation, _id: undefined } : {},
    });
  });

  app.get('/preservations/:id/:filename', async (req, res) => {
    const preservation = await preservations.findOne({
      _id: new ObjectId(req.params.id),
      'attributes.user': req.user._id,
    });

    if (preservation) {
      res.status(200);
      res.sendFile(
        path.resolve(`${__dirname}/../specs/data/${req.params.id}/${req.params.filename}`)
      );
    } else {
      res.status(404);
      res.end();
    }
  });

  return app;
};

const stopJobs = async () => {
  return new Promise(resolve => {
    resolvePromise = resolve;
  });
};

const startJobs = (job: JobFunction, interval: number) => {
  resolvePromise = undefined;
  processJobs(job, interval);
};

export { setupApp, stopJobs, startJobs };
