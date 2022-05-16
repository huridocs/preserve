import { exec } from 'child_process';
import { ObjectId } from 'mongodb';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'path';
import { Logger } from 'winston';
import { checksumFile } from '../checksumFile';
import { config } from '../config';
import { EvidenceBase, JobFunction, JobResults } from '../QueueProcessor';
import { Vault } from '../Vault';

const shell = (command: string) => {
  return new Promise((resolve, reject) => {
    const child = exec(command);
    child.addListener('error', reject);
    child.addListener('exit', resolve);
  });
};

const tsa = async (evidenceId: ObjectId, downloads: EvidenceBase['attributes']['downloads']) => {
  const aggregateChecksumPath = `/${evidenceId}/aggregateChecksum.txt`;
  await writeFile(
    path.join(config.data_path, aggregateChecksumPath),
    downloads.map(download => `${download.sha512checksum}\n`)
  );

  const timeStampRequestPath = `/${evidenceId}/tsaRequest.tsq`;
  // await writeFile(path.join(config.data_path, timeStampRequestPath), 'request not implemented');

  await shell(
    `openssl ts -query -data ${path.join(
      config.data_path,
      aggregateChecksumPath
    )} -no_nonce -sha512 -cert -out ${path.join(config.data_path, timeStampRequestPath)}`
  );

  const timeStampResponsePath = `/${evidenceId}/tsaResponse.tsr`;

  const response = await fetch('https://freetsa.org/tsr', {
    method: 'POST',
    body: await readFile(path.join(config.data_path, timeStampRequestPath)),
    headers: {
      'Content-Type': 'application/timestamp-query',
    },
  });

  await writeFile(
    path.join(config.data_path, timeStampResponsePath),
    Buffer.from(await response.arrayBuffer())
  );

  return {
    aggregateChecksum: `/evidences${aggregateChecksumPath}`,
    timeStampRequest: `/evidences${timeStampRequestPath}`,
    timeStampResponse: `/evidences${timeStampResponsePath}`,
  };
};

export class ProcessJob {
  private vault: Vault;
  private logger: Logger;

  constructor(vault: Vault, logger: Logger) {
    this.vault = vault;
    this.logger = logger;
  }

  async execute(job: JobFunction) {
    const evidence = await this.vault.processingNext();
    if (evidence) {
      try {
        this.logger.info(`Preserving evidence for ${evidence.attributes.url}`);
        const start = Date.now();
        const jobResult = await job(evidence);
        const downloads = await ProcessJob.checksumDownloads(jobResult.downloads);
        await this.vault.update(evidence._id, {
          // tsa_files: {
          //   ...(await tsa(evidence._id, downloads)),
          // },
          attributes: {
            date: new Date(),
            ...evidence.attributes,
            ...jobResult,
            downloads,
            status: 'PROCESSED',
          },
        });
        const finish = Date.now();
        this.logger.info(
          `Evidence preserved in ${(finish - start) / 1000} seconds for ${evidence.attributes.url}`
        );
      } catch (e) {
        await this.vault.update(evidence._id, {
          attributes: {
            ...evidence.attributes,
            date: new Date(),
            status: 'ERROR',
          },
          error: e instanceof Error ? e.message : 'unknown error',
        });
      }
    }
  }

  private static async checksumDownloads(downloads: JobResults['downloads']) {
    const hashedDownloads: EvidenceBase['attributes']['downloads'] = [];
    for (const download of downloads) {
      hashedDownloads.push({
        ...download,
        sha512checksum: await checksumFile(`${config.data_path}/${download.path}`),
      });
    }
    return hashedDownloads;
  }
}
