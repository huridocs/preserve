import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { ProcessJob } from './actions/ProcessJob';
import { config } from './config';
import { connectDB, disconnectDB } from './DB';
import { logger } from './logger';
import { microlinkJob } from './microlinkJob';
import { QueueProcessor } from './QueueProcessor';
import { TSAService } from './TSAService';
import { Vault } from './Vault';

const uncaughtError = (error: unknown) => {
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
  const processJob = new ProcessJob(microlinkJob(logger), vault, logger, new TSAService());
  const queue = new QueueProcessor(processJob);
  queue.start();
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
