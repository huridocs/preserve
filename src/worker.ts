import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Browser } from './infrastructure/Browser';
import { ProcessJob } from './ProcessJob';
import { config } from './config';
import { connectDB, disconnectDB } from './infrastructure/DB';
import { logger } from './infrastructure/logger';
import { QueueProcessor } from './QueueProcessor';
import { TSAService } from './infrastructure/TSAService';
import { Vault } from './infrastructure/Vault';
import { PreserveEvidence } from './actions/PreserveEvidence';
import { HTTPClient } from './infrastructure/HTTPClient';
import { YoutubeDLVideoDownloader } from './infrastructure/YoutubeDLVideoDownloader';

const uncaughtError = (error: unknown) => {
  Sentry.captureException(error);
  throw error;
};
process.on('unhandledRejection', uncaughtError);
process.on('uncaughtException', uncaughtError);

connectDB().then(db => {
  if (config.sentry.worker_dsn) {
    Sentry.init({
      release: config.VERSION,
      dsn: config.sentry.worker_dsn,
      environment: config.ENVIRONMENT,
      integrations: [
        new Tracing.Integrations.Mongo({
          useMongoose: false,
        }),
      ],
      tracesSampleRate: config.sentry.tracesSampleRate,
    });
  }
  const vault = new Vault(db);

  const preserveEvidence = new PreserveEvidence(
    new HTTPClient(),
    new YoutubeDLVideoDownloader(),
    new Browser()
  );

  const processJob = new ProcessJob(vault, logger, new TSAService(new HTTPClient()));
  const queue = new QueueProcessor(processJob);
  queue.start(preserveEvidence);
  logger.info(`Preserve jobs started`);

  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received');
    queue.stop().then(() => {
      disconnectDB().then(() => {
        logger.info('Preserve worker disconnected from database');
      });
      logger.info('Preserve worker stopped successfully');
      process.exit(0);
    });
  });
});
