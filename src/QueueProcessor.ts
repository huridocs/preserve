import { ObjectId } from 'mongodb';
import { Logger } from 'winston';
import { Vault } from './Vault';
import { logger } from './logger';
import { ProcessJob } from './actions/ProcessJob';

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

const timeout = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

let resolvePromise: undefined | ((value: unknown) => void);
const processJobs = async (job: JobFunction, vault: Vault, logger: Logger, interval = 1000) => {
  while (!resolvePromise) {
    await timeout(interval);
    const action = new ProcessJob(vault, logger);
    await action.execute(job);
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
