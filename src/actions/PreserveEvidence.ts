import createBrowserless from 'browserless';
import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { Page } from 'puppeteer';
// eslint-disable-next-line
// @ts-ignore
import fullPageScreenshot from 'puppeteer-full-page-screenshot';
import { EvidenceDB, JobOptions, JobResults, VideoDownloader } from 'src/types';
import { Logger } from 'winston';
import { config } from '../config';
import { FetchClient } from 'src/types';

export class PreserveEvidence {
  private logger: Logger;
  private httpClient: FetchClient;
  private videoDownloader: VideoDownloader;

  constructor(logger: Logger, httpClient: FetchClient, videoDownloader: VideoDownloader) {
    this.logger = logger;
    this.httpClient = httpClient;
    this.videoDownloader = videoDownloader;
  }

  execute(options: JobOptions) {
    return async (evidence: EvidenceDB): Promise<JobResults> => {
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
          const result: JobResults = {
            title: fileName || '',
            downloads: [{ path: content_path, type: 'content' }],
          };
          resolve(result);
        });
      }
      const browserlessFactory = createBrowserless({
        defaultViewPort: { width: 1024, height: 768 },
      });
      const browserless = await browserlessFactory.createContext();

      const html_content_path = path.join(evidence._id.toString(), 'content.html');
      await appendFile(path.join(evidence_dir, 'content.html'), await response.text());

      const page = await browserless.page();
      await page.setCookie(...evidence.cookies);
      return new Promise(async (resolve, reject) => {
        page.on('error', (e: Error) => {
          reject(e);
          browserless.destroyContext();
          browserlessFactory.close();
        });
        try {
          await browserless.goto(page, {
            url: evidence.attributes.url,
            waitUntil: 'networkidle0',
          });

          await page.setViewport({
            width: 0,
            height: 2000,
            deviceScaleFactor: 1,
          });

          const screenshot_path = path.join(evidence._id.toString(), 'screenshot.jpg');
          const full_screenshot_path = path.join(evidence._id.toString(), 'full_screenshot.jpg');
          await this.removeAllStickyAndFixedElements(page);
          await page.waitForTimeout(options.stepTimeout);
          await page.screenshot({
            path: path.join(evidence_dir, 'screenshot.jpg'),
          });
          await this.scrollDown(page, 600);
          await page.waitForTimeout(options.stepTimeout);
          await this.removeAllStickyAndFixedElements(page);
          await this.scrollDown(page, 0);
          await this.removeAllStickyAndFixedElements(page);
          await page.waitForTimeout(options.stepTimeout);
          await fullPageScreenshot(page, {
            path: path.join(evidence_dir, 'full_screenshot.jpg'),
          });

          const text = await page.evaluate(() => document.body.innerText);
          const content_path = path.join(evidence._id.toString(), 'content.txt');
          await appendFile(path.join(evidence_dir, 'content.txt'), text);

          const video_path = await this.videoDownloader.download(evidence, {
            output: path.join(evidence_dir, 'video.mp4'),
            format: 'best',
          });

          const result: JobResults = {
            title: await page.title(),
            downloads: [
              { path: html_content_path, type: 'content' },
              { path: content_path, type: 'content' },
              { path: screenshot_path, type: 'screenshot' },
              { path: full_screenshot_path, type: 'screenshot' },
              ...(video_path ? [{ path: video_path, type: 'video' }] : []),
            ],
          };

          await browserless.destroyContext();
          await browserlessFactory.close();
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    };
  }

  private async removeAllStickyAndFixedElements(page: Page) {
    await page.evaluate(() => {
      const elements = document.querySelectorAll('body *') || [];
      for (let i = 0; i < elements.length; i++) {
        if (
          getComputedStyle(elements[i]).position === 'fixed' ||
          getComputedStyle(elements[i]).position === 'sticky'
        ) {
          elements[i]?.parentNode?.removeChild(elements[i]);
        }
      }
    });
  }

  private async scrollDown(page: Page, amount: number) {
    await page.evaluate((y: number) => {
      window.scrollBy(0, y);
    }, amount);
  }
}
