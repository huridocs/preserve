import createBrowserless, { BrowserlessFactory, BrowserlessContext } from 'browserless';
import { Page } from 'puppeteer';

export class Browser {
  context!: BrowserlessContext;
  browserlessFactory!: BrowserlessFactory;
  page!: Page;

  async init() {
    this.browserlessFactory = createBrowserless({
      defaultViewPort: { width: 1024, height: 768 },
    });

    this.context = await this.browserlessFactory.createContext();
    this.page = await this.context.page();
  }

  async close() {
    await this.context.destroyContext();
    await this.browserlessFactory.close();
  }

  async removeAllStickyAndFixedElements() {
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

  async scrollDown(amount: number) {
    await this.page.evaluate((y: number) => {
      window.scrollBy(0, y);
    }, amount);
  }
}
