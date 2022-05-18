import express from 'express';
import { access, readFile } from 'fs/promises';
import { Server } from 'http';
import { ObjectId } from 'mongodb';
import path from 'path';
import { config } from 'src/config';
import { JobResults } from 'src/QueueProcessor';
import { microlinkJob } from 'src/microlinkJob';
import { fakeLogger } from './fakeLogger';

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
    jest.spyOn(console, 'log').mockImplementation(() => false);
    const app = express();
    app.get('/test_page', (_req, res) => {
      res.set('Content-Type', 'text/html');
      res.send(
        Buffer.from(
          '</head><title>test title</title></head><body><h2>Test Page</h2><img src="https://github.com/critocrito/sugarcube/raw/main/logo.png"></body>'
        )
      );
    });

    app.get('/cookies_route', (_req, res) => {
      res.set('Content-Type', 'text/html');
      const cookie = _req.headers.cookie;
      if (!cookie) {
        res.send('');
      }
      res.status(200);
      res.send(Buffer.from('</head><title>test title cookies</title></head><body></body>'));
    });
    await new Promise<void>(resolve => {
      server = app.listen(5960, resolve);
    });

    result = await microlinkJob(fakeLogger, { stepTimeout: 0 })({
      _id: new ObjectId(),
      user: new ObjectId(),
      cookies: [],
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

  it('should return the url title', async () => {
    expect(result.title).toBe('test title');
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
          result.downloads.find(d => d.path.match(/screenshot.jpg/))?.path || 'no_screenshot'
        )
      )
    ).toBe(true);
  });

  it('should perform full page screenshots and return the paths', async () => {
    expect(
      await exists(
        path.join(
          config.data_path,
          result.downloads.find(d => d.path.match(/full_screenshot.jpg/))?.path || 'no_screenshot'
        )
      )
    ).toBe(true);
  });

  it('should not include video when not supported', async () => {
    expect(result.downloads.find(d => d.type === 'video')).not.toBeDefined();
  });

  it('should send the cookies from the preserved URL', async () => {
    result = await microlinkJob(fakeLogger, { stepTimeout: 0 })({
      _id: new ObjectId(),
      user: new ObjectId(),
      cookies: [{ name: 'a_name', value: 'a_value', domain: 'localhost' }],
      attributes: {
        status: 'PROCESSING',
        url: 'http://localhost:5960/cookies_route',
        downloads: [],
      },
    });

    expect(result.title).toBe('test title cookies');
  }, 10000);

  it('should bubble up page errors', async () => {
    await expect(async () => {
      result = await microlinkJob(fakeLogger)({
        _id: new ObjectId(),
        user: new ObjectId(),
        cookies: [],
        attributes: {
          status: 'PROCESSING',
          url: 'chrome://crash',
          downloads: [],
        },
      });
    }).rejects.toEqual(new Error('Page crashed!'));
  });
});
