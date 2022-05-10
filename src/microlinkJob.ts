import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { config } from './config';
import { EvidenceDB, JobFunction, JobResults } from './QueueProcessor';
import { create as createYoutubeDl } from 'youtube-dl-exec';
import { Logger } from 'winston';
import createBrowserless from 'browserless';
import { Page } from 'puppeteer';
// eslint-disable-next-line
// @ts-ignore
import fullPageScreenshot from 'puppeteer-full-page-screenshot';

const removeAllStickyAndFixedElements = async (page: Page) => {
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
};

const scrollDown = async (page: Page, amount: number) => {
  await page.evaluate((y: number) => {
    window.scrollBy(0, y);
  }, amount);
};

type JobOptions = {
  stepTimeout: number;
};

const microlinkJob =
  (logger: Logger, options: JobOptions = { stepTimeout: 2000 }): JobFunction =>
  async (evidence: EvidenceDB) => {
    const browserlessFactory = createBrowserless({
      defaultViewPort: { width: 1024, height: 768 },
    });
    const browserless = await browserlessFactory.createContext();

    const evidence_dir = path.join(config.data_path, evidence._id.toString());
    await mkdir(evidence_dir);

    const page = await browserless.page();

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
        await removeAllStickyAndFixedElements(page);
        await page.waitForTimeout(options.stepTimeout);
        await page.screenshot({
          path: path.join(evidence_dir, 'screenshot.jpg'),
        });
        await scrollDown(page, 600);
        await page.waitForTimeout(options.stepTimeout);
        await removeAllStickyAndFixedElements(page);
        await scrollDown(page, 0);
        await removeAllStickyAndFixedElements(page);
        await page.waitForTimeout(options.stepTimeout);
        await fullPageScreenshot(page, {
          path: path.join(evidence_dir, 'full_screenshot.jpg'),
        });

        const text = await page.evaluate(() => document.body.innerText);
        const content_path = path.join(evidence._id.toString(), 'content.txt');
        await appendFile(path.join(evidence_dir, 'content.txt'), text);

        let video_path = '';
        try {
          const youtubedl = createYoutubeDl(config.video_downloader_path);
          await youtubedl(evidence.attributes.url, {
            output: path.join(evidence_dir, 'video.mp4'),
            format: 'best',
          });
          video_path = path.join(evidence._id.toString(), 'video.mp4');
        } catch (e: unknown) {
          if (!(e instanceof Error)) {
            throw e;
          }
          logger.error(e.message, { stacktrace: e.stack });
        }

        const result: JobResults = {
          title: await page.title(),
          downloads: [
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

export { microlinkJob };
