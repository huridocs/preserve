import { ObjectId } from 'mongodb';
import { Logger } from 'winston';
import { ProcessJob } from './actions/ProcessJob';
import { TSAService } from './TSAService';
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
  private interval: number;
  private action: ProcessJob;
  private resolvePromise: undefined | (() => void);

  constructor(action: ProcessJob, interval = 10000) {
    this.action = action;
    this.interval = interval;
  }

  async processJobs() {
    while (!this.resolvePromise) {
      await timeout(this.interval);
      await this.action.execute();
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
