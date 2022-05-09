import { config } from './config';
import { connectDB, disconnectDB } from './DB';

import { Api } from './Api';
import { Vault } from './Vault';
import { logger } from './logger';

const uncaughtError = (error: unknown) => {
  throw error;
};
process.on('unhandledRejection', uncaughtError);
process.on('uncaughtException', uncaughtError);

connectDB().then(db => {
  const app = Api(new Vault(db), logger);
  const server = app.listen(config.PORT, () => {
    logger.info(`Preserve API started on port ${config.PORT}`);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received');
    server.close(error => {
      logger.info('Gracefully closing express connections');
      if (error) {
        logger.error(error.toString());
        process.exit(1);
      }

      disconnectDB().then(() => {
        logger.info('Disconnected from database');
        logger.info('Server closed successfully');
        process.exit(0);
      });
    });
  });
});
