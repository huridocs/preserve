declare module 'browserless' {
  import { HTTPResponse, Page, WaitForOptions } from 'puppeteer';
  export interface BrowserlessContext {
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

  export interface BrowserlessFactory {
    createContext(): Promise<BrowserlessContext>;
    close(): Promise<void>;
    page(): Page;
  }
  function CreateBrowserless({}): BrowserlessFactory;
  export default CreateBrowserless;
}
