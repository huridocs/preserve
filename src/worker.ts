import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { connectDB, disconnectDB } from './DB';
import { startJobs, stopJobs } from './QueueProcessor';
import { Vault } from './Vault';
import { microlinkJob } from './microlinkJob';
import { logger } from './logger';
import { config } from './config';

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
  startJobs(microlinkJob(logger), new Vault(db), 1000);
  logger.info(`Preserve jobs started`);

  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received');
    stopJobs().then(() => {
      disconnectDB().then(() => {
        logger.info('Preserve worker disconnected from database');
      });
      logger.info('Preserve worker stopped successfully');
      process.exit(0);
    });
  });
});
