import { ObjectId } from 'mongodb';
import { checksumFile } from './checksumFile';
import { Logger } from 'winston';
import { config } from './config';
import { Vault } from './Vault';
import { logger } from './logger';

export type status = 'SCHEDULED' | 'PROCESSING' | 'PROCESSED' | 'ERROR';

export type EvidenceBase = {
  attributes: {
    date?: Date;
    status: status;
    url: string;
    downloads: { path: string; type: string; sha256checksum: string }[];
  };
};

export type EvidenceDB = EvidenceBase & { _id: ObjectId; user: ObjectId; error?: string };

export type JobResults = {
  title: string;
  downloads: { path: string; type: string }[];
};

export type JobFunction = (evidence: EvidenceDB) => Promise<JobResults>;

const timeout = (miliseconds: number) => new Promise(resolve => setTimeout(resolve, miliseconds));

const checksumDownloads = async (downloads: JobResults['downloads']) => {
  const hashedDownloads: EvidenceBase['attributes']['downloads'] = [];
  for (const download of downloads) {
    hashedDownloads.push({
      ...download,
      sha256checksum: await checksumFile(`${config.data_path}/${download.path}`),
    });
  }
  return hashedDownloads;
};

let resolvePromise: undefined | ((value: unknown) => void);
const processJobs = async (job: JobFunction, vault: Vault, logger: Logger, interval = 1000) => {
  while (!resolvePromise) {
    await timeout(interval);
    const evidence = await vault.processingNext();
    if (evidence) {
      try {
        logger.info(`Preserving evidence for ${evidence.attributes.url}`);
        const start = Date.now();
        const jobResult = await job(evidence);
        await vault.update(evidence._id, {
          attributes: {
            date: new Date(),
            ...evidence.attributes,
            ...jobResult,
            downloads: await checksumDownloads(jobResult.downloads),
            status: 'PROCESSED',
          },
        });
        const finish = Date.now();
        logger.info(
          `Evidence preserved in ${(finish - start) / 1000} seconds for ${evidence.attributes.url}`
        );
      } catch (e) {
        await vault.update(evidence._id, {
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
  resolvePromise(1);
};

const stopJobs = async () => {
  return new Promise(resolve => {
    resolvePromise = resolve;
  });
};

const startJobs = (job: JobFunction, vault: Vault, interval: number) => {
  resolvePromise = undefined;
  processJobs(job, vault, logger, interval);
};

export { startJobs, stopJobs };
