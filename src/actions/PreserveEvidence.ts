import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { Page } from 'puppeteer';
// eslint-disable-next-line
// @ts-ignore
import fullPageScreenshot from 'puppeteer-full-page-screenshot';
import { EvidenceDB, PreservationOptions, PreservationResults, VideoDownloader } from 'src/types';
import { config } from '../config';
import { FetchClient } from 'src/types';
import { Browser } from '../infrastructure/Browser';

export class PreserveEvidence {
  private httpClient: FetchClient;
  private videoDownloader: VideoDownloader;

  constructor(httpClient: FetchClient, videoDownloader: VideoDownloader) {
    this.httpClient = httpClient;
    this.videoDownloader = videoDownloader;
  }

  async execute(
    evidence: EvidenceDB,
    options: PreservationOptions = { stepTimeout: 2000 }
  ): Promise<PreservationResults> {
    const evidence_dir = path.join(config.data_path, evidence._id.toString());
    await mkdir(evidence_dir);
    const cookie = evidence.cookies.map(cookie => `${cookie.name}=${cookie.value}`).join(';');
    const response = await this.httpClient.fetch(evidence.attributes.url, {
      headers: { cookie },
    });
    const contentType = response.headers.get('Content-Type') || 'text/html';
    if (contentType.includes('application/pdf')) {
      const content_path = path.join(evidence._id.toString(), 'content.pdf');
      const array = new Uint8Array(await response.arrayBuffer());
      await appendFile(path.join(evidence_dir, 'content.pdf'), array);
      const fileName = evidence.attributes.url.split('/').pop();
      return new Promise(resolve => {
        const result: PreservationResults = {
          title: fileName || '',
          downloads: [{ path: content_path, type: 'content' }],
        };
        resolve(result);
      });
    }
    const browser = new Browser();
    await browser.init();

    const html_content_path = path.join(evidence._id.toString(), 'content.html');
    await appendFile(path.join(evidence_dir, 'content.html'), await response.text());

    await browser.page.setCookie(...evidence.cookies);
    return new Promise(async (resolve, reject) => {
      browser.page.on('error', (e: Error) => {
        reject(e);
        browser.close();
      });
      try {
        await browser.context.goto(browser.page, {
          url: evidence.attributes.url,
          waitUntil: 'networkidle0',
        });

        await browser.page.setViewport({
          width: 0,
          height: 2000,
          deviceScaleFactor: 1,
        });

        const screenshot_path = path.join(evidence._id.toString(), 'screenshot.jpg');
        const full_screenshot_path = path.join(evidence._id.toString(), 'full_screenshot.jpg');
        await browser.removeAllStickyAndFixedElements();
        await browser.page.waitForTimeout(options.stepTimeout);
        await browser.page.screenshot({
          path: path.join(evidence_dir, 'screenshot.jpg'),
        });
        await browser.scrollDown(600);
        await browser.page.waitForTimeout(options.stepTimeout);
        await browser.removeAllStickyAndFixedElements();
        await browser.scrollDown(0);
        await browser.removeAllStickyAndFixedElements();
        await browser.page.waitForTimeout(options.stepTimeout);
        await fullPageScreenshot(browser.page, {
          path: path.join(evidence_dir, 'full_screenshot.jpg'),
        });

        const text = await browser.page.evaluate(() => document.body.innerText);
        const content_path = path.join(evidence._id.toString(), 'content.txt');
        await appendFile(path.join(evidence_dir, 'content.txt'), text);
        const title = (await browser.page.title()) || evidence.attributes.url;

        await browser.close();

        const video_path = await this.videoDownloader.download(evidence, {
          output: path.join(evidence_dir, 'video.mp4'),
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
