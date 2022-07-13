import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
// eslint-disable-next-line
// @ts-ignore
import { config } from '../config';
import { Browser } from '../infrastructure/Browser';
import {
  EvidenceDB,
  FetchClient,
  Preservation,
  PreservationOptions,
  PreservationResults,
  VideoDownloader,
} from '../types';

export class PreserveEvidence {
  private httpClient: FetchClient;
  private videoDownloader: VideoDownloader;
  private browser: Browser;

  constructor(httpClient: FetchClient, videoDownloader: VideoDownloader, browser: Browser) {
    this.httpClient = httpClient;
    this.videoDownloader = videoDownloader;
    this.browser = browser;
  }

  async execute(
    _evidence: EvidenceDB,
    options: PreservationOptions = { stepTimeout: 2000 }
  ): Promise<PreservationResults> {
    const evidence = new Evidence(_evidence);
    await mkdir(evidence.directory());
    const response = await this.httpClient.fetch(evidence.url(), {
      headers: { cookie: evidence.headerCookies() },
    });
    const contentType = response.headers.get('Content-Type') || 'text/html';
    if (contentType.includes('application/pdf')) {
      const array = new Uint8Array(await response.arrayBuffer());
      await appendFile(evidence.directoryFor(Preservation.PDF), array);
      return new Promise(resolve => {
        const result: PreservationResults = {
          title: evidence.pdfFilename(),
          downloads: [...evidence.pdfPaths()],
        };
        resolve(result);
      });
    }
    await this.browser.init();
    await appendFile(evidence.directoryFor(Preservation.HTML), await response.text());

    return new Promise(async (resolve, reject) => {
      this.browser.onError(error => {
        reject(error);
        this.browser.close();
      });

      try {
        await this.browser.setCookies(evidence.rawCookies());
        await this.browser.navigateTo(evidence.url());
        const screenshotsPaths = await this.browser.takeScreenshots(evidence, options.stepTimeout);
        const plaintTextPaths = await this.browser.extractPlainText(evidence);
        const pdfPaths = await this.browser.takePdfScreenshot(evidence);
        const title = (await this.browser.pageTitle()) || evidence.url();
        await this.browser.close();

        const videoPaths = await this.videoDownloader.download(_evidence, {
          output: evidence.directoryFor(Preservation.VIDEO),
          format: 'best',
          verbose: true,
          // addHeader: `Cookie:${evidence.headerCookies()}`,
          noPlaylist: true,
          playlistEnd: 1,
          cookies: `${config.cookiesPath}/${_evidence.cookiesFile}`,
        });

        const result: PreservationResults = {
          title,
          downloads: [
            ...evidence.htmlPaths(),
            ...screenshotsPaths,
            ...plaintTextPaths,
            ...videoPaths,
            ...pdfPaths,
          ],
        };

        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }
}

export class Evidence {
  private readonly evidence: EvidenceDB;

  constructor(evidence: EvidenceDB) {
    this.evidence = evidence;
  }

  directory() {
    return path.join(config.data_path, this.evidence._id.toString());
  }

  screenshotsPaths() {
    return [
      { path: path.join(this.evidence._id.toString(), 'screenshot.jpg'), type: 'screenshot' },
      { path: path.join(this.evidence._id.toString(), 'full_screenshot.jpg'), type: 'screenshot' },
    ];
  }

  plainTextPaths() {
    return [{ path: path.join(this.evidence._id.toString(), 'content.txt'), type: 'content' }];
  }

  htmlPaths() {
    return [{ path: path.join(this.evidence._id.toString(), 'content.html'), type: 'content' }];
  }

  pdfPaths() {
    return [{ path: path.join(this.evidence._id.toString(), 'content.pdf'), type: 'content' }];
  }

  videoPaths() {
    return [{ path: path.join(this.evidence._id.toString(), 'video.mp4'), type: 'video' }];
  }

  rawCookies() {
    return this.evidence.cookies;
  }

  headerCookies() {
    return this.evidence.cookies.map(cookie => `${cookie.name}=${cookie.value}`).join(';');
  }

  url() {
    return this.evidence.attributes.url;
  }

  directoryFor(preservation: Preservation) {
    const preservations = {
      pdf: path.join(this.directory(), 'content.pdf'),
      html: path.join(this.directory(), 'content.html'),
      txt: path.join(this.directory(), 'content.txt'),
      video: path.join(this.directory(), 'video.mp4'),
      fullScreenshot: path.join(this.directory(), 'full_screenshot.jpg'),
      screenshot: path.join(this.directory(), 'screenshot.jpg'),
    };

    return preservations[preservation];
  }

  pdfFilename() {
    return this.url().split('/').pop() || '';
  }
}
