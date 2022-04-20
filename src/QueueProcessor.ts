import { EvidenceDB } from './Api';
import { Vault } from './Vault';

export type JobResults = {
  downloads: { path: string; type: string }[];
};

export type JobFunction = (evidence: EvidenceDB) => Promise<JobResults>;

const timeout = (miliseconds: number) => new Promise(resolve => setTimeout(resolve, miliseconds));

let resolvePromise: undefined | ((value: unknown) => void);
const processJobs = async (job: JobFunction, vault: Vault, interval = 1000) => {
  while (!resolvePromise) {
    await timeout(interval);

    const evidence = await vault.processingNext();

    if (evidence) {
      const jobResult = await job(evidence);
      await vault.update(evidence._id, {
        attributes: {
          ...evidence.attributes,
          ...jobResult,
          status: 'PROCESSED',
        },
      });
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
  processJobs(job, vault, interval);
};

export { startJobs, stopJobs };
