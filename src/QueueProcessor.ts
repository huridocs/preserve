import { PreserveEvidence } from './actions/PreserveEvidence';
import { ProcessJob } from './ProcessJob';

const timeout = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

export class QueueProcessor {
  private interval: number;
  private processJob: ProcessJob;
  private resolvePromise: undefined | (() => void);

  constructor(processJob: ProcessJob, interval = 1000) {
    this.processJob = processJob;
    this.interval = interval;
  }

  async processJobs(action: PreserveEvidence) {
    while (!this.resolvePromise) {
      await timeout(this.interval);
      await this.processJob.execute(action);
    }
    this.resolvePromise();
  }

  start(action: PreserveEvidence) {
    this.resolvePromise = undefined;
    this.processJobs(action);
  }

  async stop(): Promise<void> {
    return new Promise(resolve => {
      this.resolvePromise = resolve;
    });
  }
}
