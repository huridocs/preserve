import createBrowserless from 'browserless';

class Browser {
  private context: BrowserlesContext;
  private browserlessFactory: BrowserlessFactory;
  private page: any;

  async init() {
    this.browserlessFactory = createBrowserless({
      defaultViewPort: { width: 1024, height: 768 },
    });

    this.context = await this.browserlessFactory.createContext();
    this.page = await this.browserlessFactory.page();
  }

  generatePDF() {
    
  }
}

const browser = new Browser();
await browser.init();
