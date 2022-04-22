import { createLogger, transports } from 'winston';

const logConfiguration = {
  transports: [new transports.Console()],
};

const logger = createLogger(logConfiguration);

export { logger };
