import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { config } from './config';
import { EvidenceDB, JobFunction, JobResults } from './QueueProcessor';
// eslint-disable-next-line
// @ts-ignore
import createBrowserless from 'browserless';
import youtubedl from 'youtube-dl-exec';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const errorHasStderr = (error: any): error is { stderr: string } => {
  return error.stderr !== undefined;
};

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

  let video_path = '';
  try {
    await youtubedl(evidence.attributes.url, {
      output: path.join(evidence_dir, 'video.mp4'),
      format: 'worst',
    });
    video_path = path.join(evidence._id.toString(), 'video.mp4');
  } catch (e: unknown) {
    if (errorHasStderr(e) && !e.stderr.match(/Unsupported URL/)) {
      throw e;
    }
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
  return result;
};

export { microlinkJob };
