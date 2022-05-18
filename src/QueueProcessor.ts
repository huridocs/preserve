import { ObjectId } from 'mongodb';
import { ProcessJob } from './actions/ProcessJob';
import { Cookie } from '../src/types/index';

export type status = 'SCHEDULED' | 'PROCESSING' | 'PROCESSED' | 'ERROR';

export type EvidenceBase = {
  tsa_files?: {
    allChecksumsRelativePath: string;
    tsRequestRelativePath: string;
    tsResponseRelativePath: string;
  };
  attributes: {
    date?: Date;
    status: status;
    url: string;
    downloads: { path: string; type: string; sha512checksum: string }[];
  };
};

export type EvidenceDB = EvidenceBase & {
  _id: ObjectId;
  user: ObjectId;
  cookies: Cookie[];
  error?: string;
};

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

  constructor(action: ProcessJob, interval = 1000) {
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
