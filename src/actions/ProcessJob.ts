import { Logger } from 'winston';
import { Vault } from 'src/Vault';
import { EvidenceBase, JobFunction, JobResults } from 'src/QueueProcessor';
import { checksumFile } from 'src/checksumFile';
import { config } from 'src/config';

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
        await this.vault.update(evidence._id, {
          attributes: {
            date: new Date(),
            ...evidence.attributes,
            ...jobResult,
            downloads: await ProcessJob.checksumDownloads(jobResult.downloads),
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
        sha256checksum: await checksumFile(`${config.data_path}/${download.path}`),
      });
    }
    return hashedDownloads;
  }
}
