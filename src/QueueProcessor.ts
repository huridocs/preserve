import { ProcessJob } from './actions/ProcessJob';

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
