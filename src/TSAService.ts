import { exec } from 'child_process';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { config } from './config';

const shell = (command: string) => {
  return new Promise((resolve, reject) => {
    const child = exec(command);

    child.on('error', reject);
    child.on('exit', resolve);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    child.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    child.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
    });
    child.on('close', function (code) {
      console.log('closing code: ' + code);
    });
  });
};

export class TSAService {
  async timestamp(file: string, folder: string) {
    const timeStampRequestPath = `/${folder}/tsaRequest.tsq`;

    console.log(
      `openssl ts -query -data ${file} -no_nonce -sha512 -cert -out ${path.join(
        config.trusted_timestamps_path,
        timeStampRequestPath
      )}`
    );

    await shell(
      `openssl ts -query -data ${file} -no_nonce -sha512 -cert -out ${path.join(
        config.trusted_timestamps_path,
        timeStampRequestPath
      )}`
    );

    const timeStampResponsePath = `/${folder}/tsaResponse.tsr`;

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
      aggregateChecksum: file,
      timeStampRequest: timeStampRequestPath,
      timeStampResponse: timeStampResponsePath,
    };
  }
}
