declare module 'browserless' {
  import { HTTPResponse, Page, WaitForOptions } from 'puppeteer';
  interface BrowserlessContext {
    page(): Promise<Page>;
    goto(
      page: Page,
      options?: WaitForOptions & {
        referer?: string;
        url: string;
      }
    ): Promise<{ response: HTTPResponse }>;
    destroyContext(): Promise<void>;
  }
  interface BrowserlessFactory {
    createContext(): Promise<BrowserlessContext>;
    close(): Promise<void>;
  }
  function CreateBrowserless({}): BrowserlessFactory;
  export default CreateBrowserless;
}
