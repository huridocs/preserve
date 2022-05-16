import { ObjectId } from 'mongodb';
import { Logger } from 'winston';
import { ProcessJob } from './actions/ProcessJob';
import { Vault } from './Vault';

export type status = 'SCHEDULED' | 'PROCESSING' | 'PROCESSED' | 'ERROR';

export type EvidenceBase = {
  tsa_files?: {
    aggregateChecksum: string;
    timeStampRequest: string;
    timeStampResponse: string;
  };
  attributes: {
    date?: Date;
    status: status;
    url: string;
    downloads: { path: string; type: string; sha512checksum: string }[];
  };
};

export type EvidenceDB = EvidenceBase & { _id: ObjectId; user: ObjectId; error?: string };

export type JobResults = {
  title: string;
  downloads: { path: string; type: string }[];
};

export type JobFunction = (evidence: EvidenceDB) => Promise<JobResults>;

const timeout = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

export class QueueProcessor {
  private job: JobFunction;
  private vault: Vault;
  private logger: Logger;
  private interval: number;

  private resolvePromise: undefined | (() => void);

  constructor(job: JobFunction, vault: Vault, logger: Logger, interval = 1000) {
    this.job = job;
    this.vault = vault;
    this.logger = logger;
    this.interval = interval;
  }

  async processJobs() {
    while (!this.resolvePromise) {
      await timeout(this.interval);
      const action = new ProcessJob(this.vault, this.logger);
      await action.execute(this.job);
    }
    this.resolvePromise();
  }

  start() {
    this.resolvePromise = undefined;
    this.processJobs();
  }

  async stop(): Promise<void> {
    return new Promise(resolve => {
      this.resolvePromise = resolve;
    });
  }
}
