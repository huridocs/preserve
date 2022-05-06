import { connectDB, disconnectDB } from './DB';

import { startJobs, stopJobs } from './QueueProcessor';
import { Vault } from './Vault';
import { microlinkJob } from './microlinkJob';
import { logger } from './logger';

const uncaughtError = (error: unknown) => {
  throw error;
};
process.on('unhandledRejection', uncaughtError);
process.on('uncaughtException', uncaughtError);

connectDB().then(db => {
  startJobs(microlinkJob(logger), new Vault(db), 1000);
  logger.info(`Preserve jobs started`);

  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received');
    disconnectDB().then(() => {
      logger.info('Disconnected from database');
      logger.info('Server closed successfully');
      process.exit(0);
    });
    stopJobs();
  });
});
