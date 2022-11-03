import createBrowser, { BrowserlessContext, BrowserlessFactory } from 'browserless';
import { appendFile } from 'fs/promises';
import { Page } from 'puppeteer';
// eslint-disable-next-line
// @ts-ignore
import fullPageScreenshot from 'puppeteer-full-page-screenshot';
import { Evidence } from '../actions/PreserveEvidence';
import { Cookie, Preservation } from '../types';

export class Browser {
  private context!: BrowserlessContext;
  private browser!: BrowserlessFactory;
  private page!: Page;

  async init() {
    this.browser = createBrowser({
      defaultViewPort: { width: 1024, height: 768 },
    });

    this.context = await this.browser.createContext();
    this.page = await this.context.page();
  }

  onError(callback: (reason?: unknown) => void) {
    this.page.on('error', callback);
  }

  async close() {
    await this.context.destroyContext();
    await this.browser.close();
  }

  async pageTitle() {
    return this.page.title();
  }

  async navigateTo(url: string) {
    await this.context.goto(this.page, {
      url: url,
      waitUntil: 'networkidle0',
    });

    await this.page.setViewport({
      width: 0,
      height: 2000,
      deviceScaleFactor: 1,
    });
  }

  async setCookies(cookies: Cookie[]) {
    await this.page.setCookie(...cookies);
  }

  async takeScreenshots(evidence: Evidence, stepTimeout: number) {
    await this.removeAllStickyAndFixedElements();
    await this.page.waitForTimeout(stepTimeout);
    await this.page.screenshot({
      path: evidence.directoryFor(Preservation.SCREENSHOT),
    });
    await this.scrollDown(600);
    await this.page.waitForTimeout(stepTimeout);
    await this.removeAllStickyAndFixedElements();
    await this.scrollDown(0);
    await this.removeAllStickyAndFixedElements();
    await this.page.waitForTimeout(stepTimeout);
    await fullPageScreenshot(this.page, {
      path: evidence.directoryFor(Preservation.FULL_SCREENSHOT),
    });

    return evidence.screenshotsPaths();
  }

  async takePdfScreenshot(evidence: Evidence) {
    await this.page.pdf({
      path: evidence.directoryFor(Preservation.PDF),
    });

    return evidence.pdfPaths();
  }

  async extractPlainText(evidence: Evidence) {
    const text = await this.page.evaluate(() => document.body.innerText);
    const path = evidence.directoryFor(Preservation.TXT);
    await appendFile(path, text);

    return evidence.plainTextPaths();
  }

  private async removeAllStickyAndFixedElements() {
    await this.page.evaluate(() => {
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

  private async scrollDown(amount: number) {
    await this.page.evaluate((y: number) => {
      window.scrollBy(0, y);
    }, amount);
  }
}
