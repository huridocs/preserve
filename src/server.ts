import { config } from './config';
import { connectDB, disconnectDB } from './DB';

import { Api } from './Api';
import { startJobs, stopJobs } from './QueueProcessor';
import { Vault } from './Vault';
import { microlinkJob } from './microlinkJob';
import { logger } from './logger';

const uncaughtError = (error: any) => {
  throw error;
};
process.on('unhandledRejection', uncaughtError);
process.on('uncaughtException', uncaughtError);

connectDB().then(db => {
  const app = Api(new Vault(db), logger);
  const server = app.listen(config.PORT, () => {
    console.log(`Preserve API started on port ${config.PORT}`);
  });

  startJobs(microlinkJob, new Vault(db), 1000);

  process.on('SIGTERM', () => {
    process.stdout.write('SIGTERM signal received.\r\n');
    server.close(error => {
      process.stdout.write('Gracefully closing express connections\r\n');
      if (error) {
        process.stderr.write(error.toString());
        process.exit(1);
      }

      disconnectDB().then(() => {
        process.stdout.write('Disconnected from database\r\n');
        process.stdout.write('Server closed successfully\r\n');
        process.exit(0);
      });
    });
    stopJobs();
  });
});
