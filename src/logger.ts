import { createLogger, format, Logger, transports } from 'winston';
import WinstonGraylog2 from 'winston-graylog2';
import * as os from 'os';
import { config } from './config';

const logConfiguration = {
  transports: [new transports.Console()],
};

const productionConfiguration = {
  format: format.json(),
  transports: [
    new transports.Console(),
    new WinstonGraylog2({
      name: 'Graylog',
      level: 'info',
      silent: false,
      handleExceptions: true,
      exceptionsLevel: 'error',
      graylog: {
        servers: [{ host: config.logger.host, port: config.logger.port }],
        hostname: os.hostname(),
        facility: 'preserve',
      },
      staticMeta: { env: config.ENVIRONMENT },
    }),
  ],
};

const loggerFactory = (): Logger => {
  if (config.ENVIRONMENT === 'development') {
    return createLogger(logConfiguration);
  }

  // @ts-ignore
  return createLogger(productionConfiguration);
};

const logger = loggerFactory();

export { logger };
