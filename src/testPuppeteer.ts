// eslint-disable-next-line
// @ts-ignore
import createBrowserless from 'browserless';
import { mkdir } from 'fs/promises';
import path from 'path';
import { config } from './config';
// eslint-disable-next-line
// @ts-ignore
import fullPageScreenshot from 'puppeteer-full-page-screenshot';

(async url => {
  console.log('start');
  const browserlessFactory = createBrowserless({
    defaultViewPort: { width: 0, height: 768 },
    // headless: false,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });
  const browserless = await browserlessFactory.createContext();

  const evidence_dir = path.join(config.data_path, 'test_path');
  try {
    await mkdir(evidence_dir);
  } catch (e) {}

  console.log('mkdir');
  const page = await browserless.page();
  // eslint-disable-next-line
  // @ts-ignore
  page.on('error', (e: any) => {
    throw e;
  });

  await browserless.goto(page, {
    url,
    waitUntil: 'networkidle0',
  });
  // await page.waitFor(5000);
  // const page = await browserless.page();
  console.log('goto');
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

  await page.evaluate(() => {
    window.scrollBy(0, 600);
  });

  await page.waitFor(2000);

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
    window.scrollBy(0, 0);
  });

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

  await page.waitFor(4000);

  console.log('taking screenshot');
  await fullPageScreenshot(page, {
    path: path.join(evidence_dir, `${url.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`),
  });

  console.log('screenshot');
  await browserless.destroyContext();
  await browserlessFactory.close();
  console.log('close browserless');
  process.exit();
})(process.argv[2]);
