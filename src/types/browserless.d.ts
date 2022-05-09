declare module 'browserless' {
  import { Page } from 'puppeteer';
  interface BrowserlessContext {
    page(): Promise<Page>;
    destroyContext(): Promise<void>;
  }
  interface BrowserlessFactory {
    createContext(): Promise<BrowserlessContext>;
    close(): Promise<void>;
  }
  function CreateBrowserless({}): BrowserlessFactory;
  export default CreateBrowserless;
}
