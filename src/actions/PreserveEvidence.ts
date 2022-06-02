import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
// eslint-disable-next-line
// @ts-ignore
import fullPageScreenshot from 'puppeteer-full-page-screenshot';
import { EvidenceDB, FetchClient, PreservationOptions, PreservationResults, VideoDownloader } from 'src/types';
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
    evidence: EvidenceDB,
    options: PreservationOptions = { stepTimeout: 2000 }
  ): Promise<PreservationResults> {
    const domainEvidence = new Evidence(evidence);
    await mkdir(domainEvidence.directory());
    const cookie = evidence.cookies.map(cookie => `${cookie.name}=${cookie.value}`).join(';');
    const response = await this.httpClient.fetch(evidence.attributes.url, {
      headers: { cookie },
    });
    const contentType = response.headers.get('Content-Type') || 'text/html';
    if (contentType.includes('application/pdf')) {
      const content_path = path.join(evidence._id.toString(), 'content.pdf');
      const array = new Uint8Array(await response.arrayBuffer());
      await appendFile(path.join(domainEvidence.directory(), 'content.pdf'), array);
      const fileName = evidence.attributes.url.split('/').pop();
      return new Promise(resolve => {
        const result: PreservationResults = {
          title: fileName || '',
          downloads: [{ path: content_path, type: 'content' }],
        };
        resolve(result);
      });
    }
    await this.browser.init();

    const html_content_path = path.join(evidence._id.toString(), 'content.html');
    await appendFile(path.join(domainEvidence.directory(), 'content.html'), await response.text());

    return new Promise(async (resolve, reject) => {
      this.browser.page.on('error', (e: Error) => {
        reject(e);
        this.browser.close();
      });

      try {
        await this.browser.setCookies(evidence.cookies);
        await this.browser.navigateTo(evidence.attributes.url);

        const screenshot_path = path.join(evidence._id.toString(), 'screenshot.jpg');
        const full_screenshot_path = path.join(evidence._id.toString(), 'full_screenshot.jpg');
        await this.browser.removeAllStickyAndFixedElements();
        await this.browser.page.waitForTimeout(options.stepTimeout);
        await this.browser.page.screenshot({
          path: path.join(domainEvidence.directory(), 'screenshot.jpg'),
        });
        await this.browser.scrollDown(600);
        await this.browser.page.waitForTimeout(options.stepTimeout);
        await this.browser.removeAllStickyAndFixedElements();
        await this.browser.scrollDown(0);
        await this.browser.removeAllStickyAndFixedElements();
        await this.browser.page.waitForTimeout(options.stepTimeout);
        await fullPageScreenshot(this.browser.page, {
          path: path.join(domainEvidence.directory(), 'full_screenshot.jpg'),
        });

        const text = await this.browser.page.evaluate(() => document.body.innerText);
        const content_path = path.join(evidence._id.toString(), 'content.txt');
        await appendFile(path.join(domainEvidence.directory(), 'content.txt'), text);
        const title = (await this.browser.page.title()) || evidence.attributes.url;

        await this.browser.close();

        const video_path = await this.videoDownloader.download(evidence, {
          output: path.join(domainEvidence.directory(), 'video.mp4'),
          format: 'best',
          addHeader: `Cookie:${cookie}`,
          noPlaylist: true,
          playlistEnd: 1,
        });

        const result: PreservationResults = {
          title,
          downloads: [
            { path: html_content_path, type: 'content' },
            { path: content_path, type: 'content' },
            { path: screenshot_path, type: 'screenshot' },
            { path: full_screenshot_path, type: 'screenshot' },
            ...(video_path ? [{ path: video_path, type: 'video' }] : []),
          ],
        };

        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
  }
}

class Evidence {
  private evidence: EvidenceDB;
  constructor(evidence: EvidenceDB) {
    this.evidence = evidence;
  }

  directory() {
    return path.join(config.data_path, this.evidence._id.toString());
  }
}
