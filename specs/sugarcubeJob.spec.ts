import express from 'express';
import { ObjectId } from 'mongodb';
import { sugarcubeJob } from '../src/sugarcubeJob';
import { JobResults } from '../src/setupApp';
import { Server } from 'http';
import { access } from 'fs/promises';

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('sugarcubeJob', () => {
  let server: Server;
  let result: JobResults;

  beforeAll(async () => {
    const app = express();
    app.get('/test_page', (_req, res) => {
      res.set('Content-Type', 'text/html');
      res.send(Buffer.from('<h2>Test String</h2>'));
    });
    await new Promise<void>(resolve => {
      server = app.listen(5959, resolve);
    });
    result = await sugarcubeJob({
      _id: new ObjectId(),
      attributes: {
        user: new ObjectId(),
        status: 'PROCESSING',
        url: 'http://localhost:5959/test_page',
      },
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => {
      server.close(err => {
        if (err) {
          throw err;
        }
        resolve();
      });
    });
  });

  describe('sugarcubeJob', () => {
    it('should return the content of the url passed', async () => {
      expect(result.content).toMatch('Test String');
    });
    it('should perform screenshots and return the paths', async () => {
      expect(await exists(result.downloads.screenshots[0])).toBe(true);
    });
  });
});
