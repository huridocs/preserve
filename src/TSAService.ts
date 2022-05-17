import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { config } from './config';
import { shell } from './shell';

export class TSAService {
  async timestamp(file: string, subFolderName: string) {
    const timeStampRequestPath = `${subFolderName}/tsaRequest.tsq`;
    const timeStampResponsePath = `${subFolderName}/tsaResponse.tsr`;

    await shell(
      `openssl ts -query -data ${file} -no_nonce -sha512 -cert -out ${path.join(
        config.trusted_timestamps_path,
        timeStampRequestPath
      )}`
    );

    const response = await fetch('https://freetsa.org/tsr', {
      method: 'POST',
      body: await readFile(path.join(config.trusted_timestamps_path, timeStampRequestPath)),
      headers: {
        'Content-Type': 'application/timestamp-query',
      },
    });

    await writeFile(
      path.join(config.trusted_timestamps_path, timeStampResponsePath),
      Buffer.from(await response.arrayBuffer())
    );

    return {
      tsRequestRelativePath: timeStampRequestPath,
      tsResponseRelativePath: timeStampResponsePath,
    };
  }
}
