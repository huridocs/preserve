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
