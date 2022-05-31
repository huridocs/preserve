import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { FetchClient } from 'src/types';
import { config } from '../config';
import { shell } from './shell';

export class TSAService {
  private httpClient: FetchClient;

  constructor(httpClient: FetchClient) {
    this.httpClient = httpClient;
  }

  async timestamp(file: string, subFolderName: string) {
    const timeStampRequestPath = `${subFolderName}/tsaRequest.tsq`;
    const timeStampResponsePath = `${subFolderName}/tsaResponse.tsr`;

    await shell(
      `openssl ts -query -data ${file} -no_nonce -sha512 -cert -out ${path.join(
        config.trusted_timestamps_path,
        timeStampRequestPath
      )}`
    );

    const response = await this.httpClient.fetch('https://freetsa.org/tsr', {
      method: 'POST',
      body: await readFile(path.join(config.trusted_timestamps_path, timeStampRequestPath)),
      headers: {
        'Content-Type': 'application/timestamp-query',
      },
    });

    const responseFullPath = path.join(config.trusted_timestamps_path, timeStampResponsePath);
    await writeFile(responseFullPath, Buffer.from(await response.arrayBuffer()));

    return {
      files: {
        tsRequestRelativePath: timeStampRequestPath,
        tsResponseRelativePath: timeStampResponsePath,
      },
      date: new Date(await TSAService.extractTimestampFromTSAResponse(responseFullPath)),
    };
  }

  private static async extractTimestampFromTSAResponse(tsaResponseFile: string) {
    return shell(`openssl ts -reply -in ${tsaResponseFile} -text | grep Time | cut -d":" -f2-`);
  }
}
