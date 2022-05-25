import { FetchClient } from 'src/types';

export class HTTPClient implements FetchClient {
  async fetch(url: string, options: object = {}) {
    return fetch(url, options);
  }
}
