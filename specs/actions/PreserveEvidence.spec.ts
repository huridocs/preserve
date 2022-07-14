import express from 'express';
import { access, appendFile, readFile } from 'fs/promises';
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
  let preservationResults: PreservationResults;
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
      await appendFile(
        `${config.cookiesPath}/evidence.txt`,
        '# Netscape HTTP Cookie File\n127.0.0.1\tFALSE\t/\tFALSE\t0\ta_name\ta_value'
      );

      preservationResults = await preserveEvidence.execute(
        {
          _id: new ObjectId(),
          user: new ObjectId(),
          cookies: [{ name: 'a_name', value: 'a_value', domain: '127.0.0.1' }],
          cookiesFile: 'evidence.txt',
          attributes: {
            status: 'PROCESSING',
            url: 'http://127.0.0.1:5960/test_page',
            downloads: [],
          },
        },
        { stepTimeout: 0 }
      );
    }, 20000);

    it('should ignore video downloader errors', async () => {
      expect(
        preservationResults.downloads.find(download => download.type === 'video')
      ).not.toBeDefined();
    });

    it('should return the site title', async () => {
      expect(preservationResults.title).toBe('test title');
    });

    it('should use the url as title when title is empty', async () => {
      const emptyTitleResult = await preserveEvidence.execute(
        {
          _id: new ObjectId(),
          user: new ObjectId(),
          cookies: [],
          cookiesFile: 'evidence.txt',
          attributes: {
            status: 'PROCESSING',
            url: 'http://127.0.0.1:5960/no_title',
            downloads: [],
          },
        },
        { stepTimeout: 0 }
      );
      expect(emptyTitleResult.title).toBe('http://127.0.0.1:5960/no_title');
    }, 20000);

    it('should set the text content in a file and return as a download', async () => {
      const content = await readFile(
        path.join(
          config.data_path,
          preservationResults.downloads.find(d => d.path.includes('content.txt'))?.path ||
            'no content'
        ),
        'utf-8'
      );
      expect(content).toMatch('Test Page');
    });

    it('should set the html content in a file and return as a download', async () => {
      const content = await readFile(
        path.join(
          config.data_path,
          preservationResults.downloads.find(d => d.path.includes('content.html'))?.path ||
            'no content'
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
            preservationResults.downloads.find(d => d.path.match(/screenshot.jpg/))?.path ||
              'no_screenshot'
          )
        )
      ).toBe(true);
    });

    it('should perform full page screenshots and return the paths', async () => {
      expect(
        await exists(
          path.join(
            config.data_path,
            preservationResults.downloads.find(d => d.path.match(/full_screenshot.jpg/))?.path ||
              'no_screenshot'
          )
        )
      ).toBe(true);
    });

    it('should perform PDF page screenshots and return the paths', async () => {
      expect(
        await exists(
          path.join(
            config.data_path,
            preservationResults.downloads.find(d => d.path.match(/content.pdf/))?.path || 'no pdf'
          )
        )
      ).toBe(true);
    });

    it('should not include video when not supported', async () => {
      expect(preservationResults.downloads.find(d => d.type === 'video')).not.toBeDefined();
    });

    it('should download videos', async () => {
      const videoDownloaderSpy = jest.spyOn(videoDownloader, 'download');
      const evidence: EvidenceDB = {
        _id: new ObjectId(),
        user: new ObjectId(),
        cookies: [
          { name: 'a_name', value: 'a_value', domain: '127.0.0.1' },
          { name: 'another_name', value: 'another_value', domain: '127.0.0.1' },
        ],
        cookiesFile: 'evidence.txt',
        attributes: {
          status: 'PROCESSING',
          url: 'http://127.0.0.1:5960/test_page',
          downloads: [],
        },
      };

      preservationResults = await preserveEvidence.execute(evidence, { stepTimeout: 0 });

      expect(videoDownloaderSpy).toHaveBeenCalledWith(evidence, {
        format: 'best',
        output: `${config.data_path}/${evidence._id.toString()}/video.mp4`,
        noPlaylist: true,
        playlistEnd: 1,
        cookies: `${config.cookiesPath}/evidence.txt`,
      });
      videoDownloaderSpy.mockClear();
    }, 20000);
  });

  describe('preserving PDF URLs', () => {
    beforeAll(async () => {
      preservationResults = await preserveEvidence.execute(
        {
          _id: new ObjectId(),
          user: new ObjectId(),
          cookies: [],
          cookiesFile: 'evidence.txt',
          attributes: {
            status: 'PROCESSING',
            url: 'http://127.0.0.1:5960/pdf_route',
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
            preservationResults.downloads.find(d => d.path.match(/screenshot.jpg/))?.path ||
              'no_screenshot'
          )
        )
      ).toBe(false);
      expect(
        await exists(
          path.join(
            config.data_path,
            preservationResults.downloads.find(d => d.path.match(/full_screenshot.jpg/))?.path ||
              'no_screenshot'
          )
        )
      ).toBe(false);
      const preservedFile = await readFile(
        path.join(
          config.data_path,
          preservationResults.downloads.find(d => d.type === 'content')?.path || 'no content'
        ),
        'utf-8'
      );

      const originalFile = await readFile(path.join(__dirname, 'content.pdf'), 'utf-8');
      expect(originalFile).toBe(preservedFile);
      expect(preservationResults.title).toBe('pdf_route');
    }, 10000);

    it('should not download videos', async () => {
      const videoDownloaderSpy = jest.spyOn(videoDownloader, 'download');
      const evidence: EvidenceDB = {
        _id: new ObjectId(),
        user: new ObjectId(),
        cookies: [],
        cookiesFile: 'evidence.txt',
        attributes: {
          status: 'PROCESSING',
          url: 'http://127.0.0.1:5960/pdf_route',
          downloads: [],
        },
      };

      preservationResults = await preserveEvidence.execute(evidence, { stepTimeout: 0 });

      expect(videoDownloaderSpy).not.toHaveBeenCalled();
      videoDownloaderSpy.mockClear();
    }, 20000);
  });

  describe('on page errors', () => {
    it('should bubble up the errors', async () => {
      await expect(async () => {
        preservationResults = await new PreserveEvidence(
          new FakeHTTPClient(),
          new YoutubeDLVideoDownloader(),
          new Browser()
        ).execute(
          {
            _id: new ObjectId(),
            user: new ObjectId(),
            cookies: [],
            cookiesFile: 'evidence.txt',
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
});
