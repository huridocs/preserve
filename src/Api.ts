import express from 'express';
import bodyParser from 'body-parser';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

import { Collection, Db, ObjectId } from 'mongodb';
import path from 'path';
import { config } from './config';
import { authMiddleware } from './authMiddleware';
import { prometheusMiddleware } from './prometheusMiddleware';

export const timeout = (miliseconds: number) =>
  new Promise(resolve => setTimeout(resolve, miliseconds));

type status = 'SCHEDULED' | 'PROCESSING' | 'PROCESSED';

export type PreservationBase = {
  attributes: {
    status: status;
    url: string;
    downloads: {
      content?: string;
      screenshot?: string;
      video?: string;
    };
  };
};

export type Preservation = PreservationBase & { id: string };
export type PreservationDB = PreservationBase & { _id: ObjectId; attributes: { user: ObjectId } };

export let preservations: Collection<PreservationDB>;

const Api = (db: Db) => {
  preservations = db.collection<PreservationDB>('preservations');

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
          downloads: {},
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
        return {
          id: p._id,
          ...p,
          _id: undefined,
          attributes: {
            ...p.attributes,
            downloads: {
              ...(p.attributes?.downloads?.content
                ? { content: `/preservations/${p.attributes.downloads.content}` }
                : {}),
              ...(p.attributes?.downloads?.screenshot
                ? { screenshot: `/preservations/${p.attributes.downloads.screenshot}` }
                : {}),
              ...(p.attributes?.downloads?.video
                ? { video: `/preservations/${p.attributes.downloads.video}` }
                : {}),
            },
          },
        };
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
      data: preservation
        ? {
            id: preservation._id,
            ...preservation,
            _id: undefined,
            attributes: {
              ...preservation.attributes,
              downloads: {
                ...(preservation.attributes?.downloads?.content
                  ? { content: `/preservations/${preservation.attributes.downloads.content}` }
                  : {}),
                ...(preservation.attributes?.downloads?.screenshot
                  ? { screenshot: `/preservations/${preservation.attributes.downloads.screenshot}` }
                  : {}),
                ...(preservation.attributes?.downloads?.video
                  ? { video: `/preservations/${preservation.attributes.downloads.video}` }
                  : {}),
              },
            },
          }
        : {},
    });
  });

  app.get('/preservations/:id/:filename', async (req, res) => {
    const preservation = await preservations.findOne({
      _id: new ObjectId(req.params.id),
      'attributes.user': req.user._id,
    });

    if (preservation) {
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
