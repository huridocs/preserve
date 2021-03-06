import { mkdir, writeFile } from 'fs/promises';
import { ObjectId } from 'mongodb';
import path from 'path';
import * as Sentry from '@sentry/node';
import { TSAService } from 'src/infrastructure/TSAService';
import { EvidenceBase, PreservationResults } from 'src/types';
import { Logger } from 'winston';
import { PreserveEvidence } from './actions/PreserveEvidence';
import { config } from './config';
import { checksumFile } from './infrastructure/checksumFile';
import { Vault } from './infrastructure/Vault';

export class ProcessJob {
  private vault: Vault;
  private logger: Logger;
  private tsaservice: TSAService;

  constructor(vault: Vault, logger: Logger, tsaservice: TSAService) {
    this.vault = vault;
    this.logger = logger;
    this.tsaservice = tsaservice;
  }

  async execute(action: PreserveEvidence) {
    const sentryTransaction = Sentry.startTransaction({
      op: 'process-job',
      name: action.constructor.name,
    });
    Sentry.configureScope(scope => {
      scope.setSpan(sentryTransaction);
    });

    const evidence = await this.vault.processingNext();
    if (evidence) {
      try {
        this.logger.info(`Preserving evidence for ${evidence.attributes.url}`);
        const start = Date.now();
        const jobResult = await action.execute(evidence);
        const downloads = await ProcessJob.checksumDownloads(jobResult.downloads);
        const { tsa_files, date } = await this.trustedTimestamp(evidence._id, downloads);
        await this.vault.update(evidence._id, {
          tsa_files,
          attributes: {
            date,
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
        sentryTransaction.finish();
      } catch (e) {
        await this.vault.update(evidence._id, {
          attributes: {
            ...evidence.attributes,
            date: new Date(),
            status: 'ERROR',
          },
          error: e instanceof Error ? e.message : 'unknown error',
        });
        Sentry.captureException(e);
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

    const { files, date } = await this.tsaservice.timestamp(
      path.join(config.trusted_timestamps_path, aggregateChecksumPath),
      evidenceId.toString()
    );

    return {
      tsa_files: {
        allChecksumsRelativePath: aggregateChecksumPath,
        ...files,
      },
      date,
    };
  }

  private static async checksumDownloads(downloads: PreservationResults['downloads']) {
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
