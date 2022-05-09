import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { config } from './config';
import { EvidenceDB, JobFunction, JobResults } from './QueueProcessor';
import youtubedl from 'youtube-dl-exec';
import { Logger } from 'winston';
import createBrowserless from 'browserless';

const microlinkJob =
  (logger: Logger): JobFunction =>
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
        await page.goto(evidence.attributes.url, { waitUntil: 'networkidle0' });
        const text = await page.evaluate(() => document.body.innerText);
        const content_path = path.join(evidence._id.toString(), 'content.txt');
        await appendFile(path.join(evidence_dir, 'content.txt'), text);

        const screenshot_path = path.join(evidence._id.toString(), 'screenshot.jpg');
        await page.screenshot({
          path: path.join(evidence_dir, 'screenshot.jpg'),
          fullPage: true,
        });

        let video_path = '';
        try {
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
