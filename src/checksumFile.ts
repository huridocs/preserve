import CryptoJS from 'crypto-js';
import fs from 'fs';

export const checksumFile = (path: string) => {
  return new Promise<string>(function (resolve, reject) {
    const sha256 = CryptoJS.algo.SHA256.create();
    const input = fs.createReadStream(path);

    input.on('error', reject);
    input.on('data', function (chunk) {
      sha256.update(chunk.toString());
    });

    input.on('close', function () {
      resolve(sha256.finalize().toString());
    });
  });
};
