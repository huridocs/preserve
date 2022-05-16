import { JobFunction } from './QueueProcessor';
import { Logger } from 'winston';
import { PreserveEvidence } from 'src/actions/PreserveEvidence';

export type JobOptions = {
  stepTimeout: number;
};

const microlinkJob = (logger: Logger, options: JobOptions = { stepTimeout: 2000 }): JobFunction => {
  const action = new PreserveEvidence(logger);
  return action.execute(options);
};

export { microlinkJob };
