import express from 'express';
import { access, readFile } from 'fs/promises';
import { Server } from 'http';
import { ObjectId } from 'mongodb';
import path from 'path';
import { config } from 'src/config';
import { JobResults } from 'src/setupApp';
import { sugarcubeJob } from 'src/sugarcubeJob';

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
      res.send(
        Buffer.from(
          '<body><h2>Test Page</h2><img src="https://github.com/critocrito/sugarcube/raw/main/logo.png"></body>'
        )
      );
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
  }, 20000);

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

  it('should set the content in a file and return as a download', async () => {
    const content = await readFile(
      path.join(config.data_path, result.downloads?.content || 'no content'),
      'utf-8'
    );
    expect(content).toMatch('Test Page');
  });

  it('should perform screenshots and return the paths', async () => {
    expect(
      await exists(path.join(config.data_path, result.downloads?.screenshot || 'no_screenshot'))
    ).toBe(true);
  });
});
