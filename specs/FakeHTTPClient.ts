import { FetchClient } from 'src/types';

export class FakeHTTPClient implements FetchClient {
  async fetch(): Promise<Response> {
    return {
      headers: {
        get() {
          return 'text/html';
        },
      },
      async text() {
        return 'text';
      },
    } as unknown as Response;
  }
}
