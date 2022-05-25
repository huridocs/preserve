import express from 'express';
import { access, readFile } from 'fs/promises';
import { Server } from 'http';
import { ObjectId } from 'mongodb';
import path from 'path';
import { config } from 'src/config';
import { JobResults } from 'src/types';
import { microlinkJob } from 'src/microlinkJob';
import { HTTPClient } from '../src/HTTPClient';
import { FakeHTTPClient } from './FakeHTTPClient';
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
      const cookie = _req.headers.cookie;
      if (!cookie) {
        res.send('');
      }
      res.send(
        Buffer.from('</head><title>test title</title></head><body><h2>Test Page</h2></body>')
      );
    });

    app.get('/pdf_route', (_req, res) => {
      res.set('Content-Type', 'application/pdf');
      res.status(200);
      const filePath = __dirname + '/content.pdf';
      res.sendFile(filePath);
    });

    await new Promise<void>(resolve => {
      server = app.listen(5960, resolve);
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

  describe('preserving HTML sites', () => {
    beforeAll(async () => {
      result = await microlinkJob(fakeLogger, new HTTPClient(), { stepTimeout: 0 })({
        _id: new ObjectId(),
        user: new ObjectId(),
        cookies: [{ name: 'a_name', value: 'a_value', domain: 'localhost' }],
        attributes: {
          status: 'PROCESSING',
          url: 'http://localhost:5960/test_page',
          downloads: [],
        },
      });
    }, 20000);

    it('should return the url title', async () => {
      expect(result.title).toBe('test title');
    });

    it('should set the text content in a file and return as a download', async () => {
      const content = await readFile(
        path.join(
          config.data_path,
          result.downloads.find(d => d.path.includes('content.txt'))?.path || 'no content'
        ),
        'utf-8'
      );
      expect(content).toMatch('Test Page');
    });

    it('should set the html content in a file and return as a download', async () => {
      const content = await readFile(
        path.join(
          config.data_path,
          result.downloads.find(d => d.path.includes('content.html'))?.path || 'no content'
        ),
        'utf-8'
      );
      expect(content).toMatch(
        '</head><title>test title</title></head><body><h2>Test Page</h2></body>'
      );
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
  });

  describe('preserving PDF URLs', () => {
    it('should preserve only the served file', async () => {
      result = await microlinkJob(fakeLogger, new HTTPClient(), { stepTimeout: 0 })({
        _id: new ObjectId(),
        user: new ObjectId(),
        cookies: [],
        attributes: {
          status: 'PROCESSING',
          url: 'http://localhost:5960/pdf_route',
          downloads: [],
        },
      });

      expect(
        await exists(
          path.join(
            config.data_path,
            result.downloads.find(d => d.path.match(/screenshot.jpg/))?.path || 'no_screenshot'
          )
        )
      ).toBe(false);
      expect(
        await exists(
          path.join(
            config.data_path,
            result.downloads.find(d => d.path.match(/full_screenshot.jpg/))?.path || 'no_screenshot'
          )
        )
      ).toBe(false);
      const preservedFile = await readFile(
        path.join(
          config.data_path,
          result.downloads.find(d => d.type === 'content')?.path || 'no content'
        ),
        'utf-8'
      );

      const originalFile = await readFile(path.join(__dirname, 'content.pdf'), 'utf-8');
      expect(originalFile).toBe(preservedFile);
      expect(result.title).toBe('pdf_route');
    }, 10000);
  });

  describe('on page errors', () => {
    it('should bubble up the errors', async () => {
      await expect(async () => {
        result = await microlinkJob(
          fakeLogger,
          new FakeHTTPClient()
        )({
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
});
