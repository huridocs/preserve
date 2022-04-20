import express from 'express';
import { access, readFile } from 'fs/promises';
import { Server } from 'http';
import { ObjectId } from 'mongodb';
import path from 'path';
import { config } from 'src/config';
import { JobResults } from 'src/QueueProcessor';
import { microlinkJob } from 'src/microlinkJob';

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('microlinkJob', () => {
  let server: Server;
  let result: JobResults;

  beforeAll(async () => {
    // jest.spyOn(console, 'log').mockImplementation(() => false);
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
      server = app.listen(5960, resolve);
    });

    result = await microlinkJob({
      _id: new ObjectId(),
      user: new ObjectId(),
      attributes: {
        status: 'PROCESSING',
        url: 'http://localhost:5960/test_page',
        downloads: [],
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
      path.join(
        config.data_path,
        result.downloads.find(d => d.type === 'content')?.path || 'no content'
      ),
      'utf-8'
    );
    expect(content).toMatch('Test Page');
  });

  it('should perform screenshots and return the paths', async () => {
    expect(
      await exists(
        path.join(
          config.data_path,
          result.downloads.find(d => d.type === 'screenshot')?.path || 'no_screenshot'
        )
      )
    ).toBe(true);
  });
});
