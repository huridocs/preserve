import express from 'express';
import { access, readFile } from 'fs/promises';
import { Server } from 'http';
import { ObjectId } from 'mongodb';
import path from 'path';
import { config } from 'src/config';
import { EvidenceDB, PreservationResults } from 'src/types';
import { HTTPClient } from 'src/infrastructure/HTTPClient';
import {
  VideoDownloaderError,
  YoutubeDLVideoDownloader,
} from 'src/infrastructure/YoutubeDLVideoDownloader';
import { Browser } from 'src/infrastructure/Browser';
import { FakeHTTPClient } from '../FakeHTTPClient';
import { PreserveEvidence } from 'src/actions/PreserveEvidence';

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('PreserveEvidence', () => {
  let server: Server;
  let result: PreservationResults;
  const videoDownloader = new YoutubeDLVideoDownloader();
  const preserveEvidence = new PreserveEvidence(new HTTPClient(), videoDownloader, new Browser());

  beforeAll(async () => {
    const app = express();
    app.get('/no_title', (_req, res) => {
      res.send(Buffer.from('</head><title></title></head><body></body>'));
    });
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
      result = await preserveEvidence.execute(
        {
          _id: new ObjectId(),
          user: new ObjectId(),
          cookies: [{ name: 'a_name', value: 'a_value', domain: 'localhost' }],
          attributes: {
            status: 'PROCESSING',
            url: 'http://localhost:5960/test_page',
            downloads: [],
          },
        },
        { stepTimeout: 0 }
      );
    }, 20000);

    it('should ignore "UNSUPORTED URL" error', async () => {
      expect(result.downloads.find(download => download.type === 'video')).not.toBeDefined();
    });

    it('should return the site title', async () => {
      expect(result.title).toBe('test title');
    });

    it('should use the url as title when title is empty', async () => {
      const emptyTitleResult = await preserveEvidence.execute(
        {
          _id: new ObjectId(),
          user: new ObjectId(),
          cookies: [],
          attributes: {
            status: 'PROCESSING',
            url: 'http://localhost:5960/no_title',
            downloads: [],
          },
        },
        { stepTimeout: 0 }
      );
      expect(emptyTitleResult.title).toBe('http://localhost:5960/no_title');
    }, 20000);

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

    it('should download videos', async () => {
      const videoDownloaderSpy = jest.spyOn(videoDownloader, 'download');
      const evidence: EvidenceDB = {
        _id: new ObjectId(),
        user: new ObjectId(),
        cookies: [
          { name: 'a_name', value: 'a_value', domain: 'localhost' },
          { name: 'another_name', value: 'another_value', domain: 'localhost' },
        ],
        attributes: {
          status: 'PROCESSING',
          url: 'http://localhost:5960/test_page',
          downloads: [],
        },
      };
      result = await preserveEvidence.execute(evidence, { stepTimeout: 0 });

      expect(videoDownloaderSpy).toHaveBeenCalledWith(evidence, {
        format: 'best',
        output: `${config.data_path}/${evidence._id.toString()}/video.mp4`,
        addHeader: 'Cookie:a_name=a_value;another_name=another_value',
        noPlaylist: true,
        playlistEnd: 1,
      });
      videoDownloaderSpy.mockClear();
    }, 20000);
  });

  describe('preserving PDF URLs', () => {
    beforeAll(async () => {
      result = await preserveEvidence.execute(
        {
          _id: new ObjectId(),
          user: new ObjectId(),
          cookies: [],
          attributes: {
            status: 'PROCESSING',
            url: 'http://localhost:5960/pdf_route',
            downloads: [],
          },
        },
        { stepTimeout: 0 }
      );
    }, 20000);

    it('should preserve only the served file', async () => {
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

    it('should not download videos', async () => {
      const videoDownloaderSpy = jest.spyOn(videoDownloader, 'download');
      const evidence: EvidenceDB = {
        _id: new ObjectId(),
        user: new ObjectId(),
        cookies: [],
        attributes: {
          status: 'PROCESSING',
          url: 'http://localhost:5960/pdf_route',
          downloads: [],
        },
      };

      result = await preserveEvidence.execute(evidence, { stepTimeout: 0 });

      expect(videoDownloaderSpy).not.toHaveBeenCalled();
      videoDownloaderSpy.mockClear();
    }, 20000);
  });

  describe('on page errors', () => {
    it('should bubble up the errors', async () => {
      await expect(async () => {
        result = await new PreserveEvidence(
          new FakeHTTPClient(),
          new YoutubeDLVideoDownloader(),
          new Browser()
        ).execute(
          {
            _id: new ObjectId(),
            user: new ObjectId(),
            cookies: [],
            attributes: {
              status: 'PROCESSING',
              url: 'chrome://crash',
              downloads: [],
            },
          },
          { stepTimeout: 0 }
        );
      }).rejects.toEqual(new Error('Page crashed!'));
    });
  });

  describe('on video download errors', () => {
    it('should bubble up video downloader error', async () => {
      config.video_downloader_path = 'bad_executable';
      const preserveAction = new PreserveEvidence(
        new HTTPClient(),
        new YoutubeDLVideoDownloader(),
        new Browser()
      );
      await expect(
        async () =>
          await preserveAction.execute(
            {
              _id: new ObjectId(),
              user: new ObjectId(),
              cookies: [],
              attributes: {
                status: 'PROCESSING',
                url: 'http://localhost:5960/test_page',
                downloads: [],
              },
            },
            { stepTimeout: 0 }
          )
      ).rejects.toBeInstanceOf(VideoDownloaderError);
    }, 20000);
  });
});
