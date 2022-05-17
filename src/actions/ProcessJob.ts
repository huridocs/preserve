import { mkdir, writeFile } from 'fs/promises';
import { ObjectId } from 'mongodb';
import path from 'path';
import { TSAService } from 'src/TSAService';
import { Logger } from 'winston';
import { checksumFile } from '../checksumFile';
import { config } from '../config';
import { EvidenceBase, JobFunction, JobResults } from '../QueueProcessor';
import { Vault } from '../Vault';

export class ProcessJob {
  private vault: Vault;
  private logger: Logger;
  private job: JobFunction;
  private tsaservice: TSAService;

  constructor(job: JobFunction, vault: Vault, logger: Logger, tsaservice: TSAService) {
    this.vault = vault;
    this.logger = logger;
    this.job = job;
    this.tsaservice = tsaservice;
  }

  async execute() {
    const evidence = await this.vault.processingNext();
    if (evidence) {
      try {
        this.logger.info(`Preserving evidence for ${evidence.attributes.url}`);
        const start = Date.now();
        const jobResult = await this.job(evidence);
        const downloads = await ProcessJob.checksumDownloads(jobResult.downloads);
        const tsa_files = await this.trustedTimestamp(evidence._id, downloads);
        await this.vault.update(evidence._id, {
          tsa_files,
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

  private async trustedTimestamp(
    evidenceId: ObjectId,
    downloads: EvidenceBase['attributes']['downloads']
  ) {
    await mkdir(`${config.trusted_timestamps_path}/${evidenceId}`);
    const aggregateChecksumPath = `${evidenceId}/aggregateChecksum.txt`;
    await writeFile(
      path.join(config.trusted_timestamps_path, aggregateChecksumPath),
      downloads.map(download => `${download.sha512checksum}\n`)
    );

    return {
      allChecksumsRelativePath: aggregateChecksumPath,
      ...(await this.tsaservice.timestamp(
        path.join(config.trusted_timestamps_path, aggregateChecksumPath),
        evidenceId.toString()
      )),
    };
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
