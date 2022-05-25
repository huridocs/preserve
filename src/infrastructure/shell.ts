import { exec } from 'child_process';

export const shell = (command: string) => {
  return new Promise<string>((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(stderr);
        return;
      }
      resolve(stdout);
    });
  });
};

export const extractTimestampFromTSAResponse = async (tsaResponseFile: string) => {
  return shell(`openssl ts -reply -in ${tsaResponseFile} -text | grep Time | cut -d":" -f2-`);
};
