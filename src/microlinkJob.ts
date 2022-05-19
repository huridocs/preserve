import { Logger } from 'winston';
import { PreserveEvidence } from './actions/PreserveEvidence';
import { JobFunction, JobOptions } from './types';

const microlinkJob = (logger: Logger, options: JobOptions = { stepTimeout: 2000 }): JobFunction => {
  const action = new PreserveEvidence(logger);
  return action.execute(options);
};

export { microlinkJob };
