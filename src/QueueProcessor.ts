import { timeout, preservations, PreservationDB } from './Api';

export type JobResults = {
  downloads: {
    content: string;
    screenshot?: string;
    video?: string;
  };
};

export type JobFunction = (preservation: PreservationDB) => Promise<JobResults>;

let resolvePromise: undefined | ((value: unknown) => void);
const processJobs = async (job: JobFunction, interval = 1000) => {
  while (!resolvePromise) {
    await timeout(interval);

    const preservation = (
      await preservations.findOneAndUpdate(
        { 'attributes.status': 'SCHEDULED' },
        { $set: { 'attributes.status': 'PROCESSING' } }
      )
    ).value;

    if (preservation) {
      const preservationMetadata = await job(preservation);
      await preservations.updateOne(
        { _id: preservation._id },
        {
          $set: {
            attributes: {
              ...preservation.attributes,
              ...preservationMetadata,
              status: 'PROCESSED',
            },
          },
        }
      );
    }
  }
  resolvePromise(1);
};

const stopJobs = async () => {
  return new Promise(resolve => {
    resolvePromise = resolve;
  });
};

const startJobs = (job: JobFunction, interval: number) => {
  resolvePromise = undefined;
  processJobs(job, interval);
};

export { startJobs, stopJobs };
