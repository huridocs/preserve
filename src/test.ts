import { chromium, Page } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { config } from './config';

(async () => {
  console.log('start');
  const evidence_dir = path.join(config.data_path, 'test_path');
  await mkdir(evidence_dir);
  console.log('mkdir');

  const browser = await chromium.launch({
    headless: false,
    // ignoreDefaultArgs: true,
    args: [
      // `--disable-extensions-except=/home/joan/Downloads/test`,
      // `--load-extension=/home/joan/Downloads/test`,
      // '--enable-automation',
    ],
  }); // Or 'firefox' or 'webkit'.
  const page = await browser.newPage();
  try {
    await page.goto(
      // 'https://www.un.org/en/about-us/universal-declaration-of-human-rights',
      // 'https://www.youtube.com/',
      // 'https://www.elmundo.es/economia/empresas/2022/05/03/6271a27afc6c83ba748b45a1.html',
      // 'https://twitter.com/SpaceX/status/1522083920992370688?cxt=HHwWgICs0eDQw58qAAAA',
      // 'https://twitter.com/elonmusk',
      // 'https://www.reddit.com/r/BattleBrothers/',
      // 'https://www.atptour.com/',
      'https://www.washingtonpost.com/sports/nationals/the-astros-are-back-in-this-world-series-and-the-chess-game-is-officially-afoot/2019/10/26/ad6739c4-f75f-11e9-ad8b-85e2aa00b5ce_story.html',
      // 'https://huridocs.org/2022/04/new-database-offers-a-view-into-harsh-conditions-in-north-korean-prisons/',
      // 'http://uwazi.io',
      {
        waitUntil: 'load',
      }
    );

    console.log('goto');
  } catch (e) {
    await page.screenshot({
      path: path.join(evidence_dir, 'screenshot.jpg'),
      fullPage: true,
    });
  }

  await page.screenshot({
    path: path.join(evidence_dir, 'screenshot.jpg'),
    fullPage: true,
  });

  await browser.close();
})();
