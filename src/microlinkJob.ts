import { Logger } from 'winston';
import { PreserveEvidence } from './actions/PreserveEvidence';
import { HTTPClient } from './infrastructure/HTTPClient';
import { YoutubeDLVideoDownloader } from './infrastructure/YoutubeDLVideoDownloader';
import { FetchClient, JobFunction, JobOptions, VideoDownloader } from './types';

const microlinkJob = (
  logger: Logger,
  httpClient: FetchClient = new HTTPClient(),
  videoDownloader: VideoDownloader = new YoutubeDLVideoDownloader(logger),
  options: JobOptions = { stepTimeout: 2000 }
): JobFunction => {
  const action = new PreserveEvidence(logger, httpClient, videoDownloader);
  return action.execute(options);
};

export { microlinkJob };
