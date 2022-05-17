import { appendFile, mkdir, rm } from 'fs/promises';
import path from 'path';
import { config } from 'src/config';
import { shell } from 'src/shell';
import { TSAService } from 'src/TSAService';

describe('TSAService', () => {
  const service = new TSAService();
  const folder = `${config.trusted_timestamps_path}test`;
  const file = `${folder}/file_to_timestamp.txt`;

  beforeAll(async () => {
    await mkdir(`${config.trusted_timestamps_path}/test/`);
    await appendFile(file, 'plain text content');
  });

  afterAll(async () => {
    await rm(folder, { recursive: true });
  });

  describe('timestamp', () => {
    it('should use freetsa.org to timestamp the file and store the request/response on a specific folder', async () => {
      const { tsRequestRelativePath, tsResponseRelativePath } = await service.timestamp(
        file,
        'test'
      );
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
    });
  });
});
