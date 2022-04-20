import { PreservationDB } from './Api';
import { Preservations } from './Preservations';

export type JobResults = {
  downloads: { path: string; type: string }[];
};

export type JobFunction = (preservation: PreservationDB) => Promise<JobResults>;

const timeout = (miliseconds: number) => new Promise(resolve => setTimeout(resolve, miliseconds));

let resolvePromise: undefined | ((value: unknown) => void);
const processJobs = async (job: JobFunction, preservations: Preservations, interval = 1000) => {
  while (!resolvePromise) {
    await timeout(interval);

    const preservation = await preservations.processingNext();

    if (preservation) {
      const preservationMetadata = await job(preservation);
      await preservations.update(preservation._id, {
        attributes: {
          ...preservation.attributes,
          ...preservationMetadata,
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

const startJobs = (job: JobFunction, preservation: Preservations, interval: number) => {
  resolvePromise = undefined;
  processJobs(job, preservation, interval);
};

export { startJobs, stopJobs };
