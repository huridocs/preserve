import express from 'express';
import bodyParser from 'body-parser';

import { Collection, Db, ObjectId } from 'mongodb';
import { authMiddleware } from './authMiddleware';

let preservations: Collection;
let resolvePromise: (value: unknown) => void;
const timeout = (miliseconds: number) => new Promise(resolve => setTimeout(resolve, miliseconds));
const processJobs = async (job, interval = 1000) => {
  while (!resolvePromise) {
    await timeout(interval);

    const preservation = (
      await preservations.findOneAndUpdate(
        { status: 'SCHEDULED' },
        { $set: { status: 'PROCESSING' } }
      )
    ).value;

    if (preservation) {
      await job();
      await preservations.updateOne({ _id: preservation._id }, { $set: { status: 'PROCESSED' } });
    }
  }
  resolvePromise(1);
};

const setupApp = (db: Db) => {
  preservations = db.collection('preservations');

  const app = express();
  app.use(bodyParser.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(authMiddleware);

  app.post('/api/preservations', async (req, res) => {
    res.status(202);
    const id = new ObjectId();
    const result = { _id: id, url: req.body.url, user: req.user._id };
    await preservations.insertOne({ ...result, status: 'SCHEDULED' });
    res.json({
      data: result,
      links: {
        self: `/api/preservations/${id}`,
      },
    });
  });

  app.get('/api/preservations', async (req, res) => {
    res.json(await preservations.find({ user: req.user._id }).toArray());
  });

  app.get('/api/preservations/:id', async (req, res) => {
    const preservation = await preservations.findOne({
      _id: new ObjectId(req.params.id),
      user: req.user._id,
    });
    res.status(preservation ? 200 : 404);
    res.json(preservation ? preservation : {});
  });

  return app;
};

const stopJobs = async () => {
  return new Promise(resolve => {
    resolvePromise = resolve;
  });
};

const startJobs = (job, interval: number) => {
  resolvePromise = undefined;
  processJobs(job, interval);
};

export { setupApp, stopJobs, startJobs };
