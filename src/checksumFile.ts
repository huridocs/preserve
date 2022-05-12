import CryptoJS from 'crypto-js';
import fs from 'fs';

export const checksumFile = (path: string) => {
  return new Promise<string>((resolve, reject) => {
    const sha512 = CryptoJS.algo.SHA512.create();
    const input = fs.createReadStream(path);

    input.on('error', reject);
    input.on('data', chunk => {
      sha512.update(chunk.toString());
    });

    input.on('close', () => {
      resolve(sha512.finalize().toString());
    });
  });
};
