import { Logger } from 'winston';
import { PreserveEvidence } from './actions/PreserveEvidence';
import { HTTPClient } from './HTTPClient';
import { FetchClient, JobFunction, JobOptions } from './types';

const microlinkJob = (
  logger: Logger,
  httpClient: FetchClient = new HTTPClient(),
  options: JobOptions = { stepTimeout: 2000 }
): JobFunction => {
  const action = new PreserveEvidence(logger, httpClient);
  return action.execute(options);
};

export { microlinkJob };
