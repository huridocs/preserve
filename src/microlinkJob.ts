import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { config } from './config';
import { EvidenceDB } from './Api';
import { JobFunction, JobResults } from './QueueProcessor';
// @ts-ignore
import createBrowserless from 'browserless';

const microlinkJob: JobFunction = async (evidence: EvidenceDB) => {
  const browserlessFactory = createBrowserless({
    defaultViewPort: { width: 1024, height: 768 },
  });
  const browserless = await browserlessFactory.createContext();

  const evidence_dir = path.join(config.data_path, evidence._id.toString());
  await mkdir(evidence_dir);

  const page = await browserless.page();
  await page.goto(evidence.attributes.url);

  const text = await page.evaluate(() => document.body.innerText);
  const content_path = path.join(evidence._id.toString(), 'content.txt');
  await appendFile(path.join(evidence_dir, 'content.txt'), text);

  const screenshot_path = path.join(evidence._id.toString(), 'screenshot.jpg');
  await page.screenshot({
    path: path.join(evidence_dir, 'screenshot.jpg'),
    fullPage: true,
  });

  await browserless.destroyContext();
  await browserlessFactory.close();

  const result: JobResults = {
    downloads: [
      { path: content_path, type: 'content' },
      { path: screenshot_path, type: 'screenshot' },
      // ...(screenshot_path ? [{ path: screenshot_path, type: 'screenshot' }] : []),
      // ...(video_path ? [{ path: video_path, type: 'video' }] : []),
    ],
  };

  return result;
};

export { microlinkJob };
