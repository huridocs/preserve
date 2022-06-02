import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
// eslint-disable-next-line
// @ts-ignore
import fullPageScreenshot from 'puppeteer-full-page-screenshot';
import {
  EvidenceDB,
  FetchClient,
  Preservation,
  PreservationOptions,
  PreservationResults,
  VideoDownloader,
} from 'src/types';
import { config } from '../config';
import { Browser } from '../infrastructure/Browser';

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
          downloads: [...evidence.pdfDownloads()],
        };
        resolve(result);
      });
    }
    await this.browser.init();

    await appendFile(evidence.directoryFor(Preservation.HTML), await response.text());

    return new Promise(async (resolve, reject) => {
      this.browser.page.on('error', (e: Error) => {
        reject(e);
        this.browser.close();
      });

      try {
        await this.browser.setCookies(evidence.rawCookies());
        await this.browser.navigateTo(evidence.url());

        await this.browser.removeAllStickyAndFixedElements();
        await this.browser.page.waitForTimeout(options.stepTimeout);
        await this.browser.page.screenshot({
          path: evidence.directoryFor(Preservation.SCREENSHOT),
        });
        await this.browser.scrollDown(600);
        await this.browser.page.waitForTimeout(options.stepTimeout);
        await this.browser.removeAllStickyAndFixedElements();
        await this.browser.scrollDown(0);
        await this.browser.removeAllStickyAndFixedElements();
        await this.browser.page.waitForTimeout(options.stepTimeout);
        await fullPageScreenshot(this.browser.page, {
          path: evidence.directoryFor(Preservation.FULL_SCREENSHOT),
        });

        const text = await this.browser.page.evaluate(() => document.body.innerText);
        await appendFile(evidence.directoryFor(Preservation.TXT), text);
        const title = (await this.browser.page.title()) || evidence.url();

        await this.browser.close();

        const videoPath = await this.videoDownloader.download(_evidence, {
          output: evidence.directoryFor(Preservation.VIDEO),
          format: 'best',
          addHeader: `Cookie:${evidence.headerCookies()}`,
          noPlaylist: true,
          playlistEnd: 1,
        });

        const result: PreservationResults = {
          title,
          downloads: [
            ...evidence.downloads(),
            ...(videoPath ? [{ path: videoPath, type: 'video' }] : []),
          ],
        };

        resolve(result);
      } catch (e) {
        reject(e);
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

  downloads() {
    return [
      { path: path.join(this.evidence._id.toString(), 'content.html'), type: 'content' },
      { path: path.join(this.evidence._id.toString(), 'content.txt'), type: 'content' },
      { path: path.join(this.evidence._id.toString(), 'screenshot.jpg'), type: 'screenshot' },
      { path: path.join(this.evidence._id.toString(), 'full_screenshot.jpg'), type: 'screenshot' },
    ];
  }

  pdfDownloads() {
    return [{ path: path.join(this.evidence._id.toString(), 'content.pdf'), type: 'content' }];
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
