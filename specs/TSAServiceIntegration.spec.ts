import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { config } from 'src/config';
import { HTTPClient } from 'src/infrastructure/HTTPClient';
import { shell } from 'src/infrastructure/shell';
import { TSAService } from 'src/infrastructure/TSAService';

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchDate(date: Date): R;
    }
  }
}

expect.extend({
  toMatchDate(expected, toMatch) {
    const match = expected.toISOString().split('T')[0] === toMatch.toISOString().split('T')[0];
    return match
      ? { pass: true, message: () => `Expected ${expected} to be the same date as ${toMatch}` }
      : { pass: false, message: () => `Expected ${expected} to be the same date as ${toMatch}` };
  },
});

describe('TSAService', () => {
  const service = new TSAService(new HTTPClient());
  let file: string;

  beforeAll(async () => {
    const folder = `${config.trusted_timestamps_path}/test`;
    file = `${folder}/file_to_timestamp.txt`;
    await mkdir(`${config.trusted_timestamps_path}/test/`);
    await appendFile(file, 'plain text content');
  });

  describe('timestamp', () => {
    it('should use freetsa.org to timestamp the file and store the request/response files on a specific folder', async () => {
      const {
        files: { tsRequestRelativePath, tsResponseRelativePath },
        date,
      } = await service.timestamp(file, 'test');

      const timeStampRequestFullPath = path.join(
        config.trusted_timestamps_path,
        tsRequestRelativePath
      );
      const timeStampResponseFullPath = path.join(
        config.trusted_timestamps_path,
        tsResponseRelativePath
      );

      await shell(
        `openssl ts -verify -in ${timeStampResponseFullPath} -queryfile ${timeStampRequestFullPath} -CAfile ${config.freetsa.pemFile} -untrusted ${config.freetsa.crtFile}`
      );

      expect(date).toMatchDate(new Date());
    });
  });
});
