import { config } from './config';
import { connectDB, disconnectDB } from './infrastructure/DB';

import { Api } from './api/Api';
import { UsersRepository } from './infrastructure/UsersRepository';
import { Vault } from './infrastructure/Vault';
import { logger } from './infrastructure/logger';

const uncaughtError = (error: unknown) => {
  throw error;
};
process.on('unhandledRejection', uncaughtError);
process.on('uncaughtException', uncaughtError);

connectDB().then(db => {
  const app = Api(new Vault(db), new UsersRepository(db), logger);
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
        logger.info('Preserve API disconnected from database');
        logger.info('Server closed successfully');
        process.exit(0);
      });
    });
  });
});
