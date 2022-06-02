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
}
