import { createLogger, format, Logger, transports } from 'winston';
import WinstonGraylog2 from 'winston-graylog2';
import * as os from 'os';
import { config } from './config';

const logConfiguration = {
  transports: [new transports.Console()],
};

const productionConfiguration = {
  // format: format.combine(format.errors({ stack: true }), format.timestamp(), format.json()),
  format: format.combine(format.timestamp(), format.json()),
  expressFormat: true,
  defaultMeta: {
    service: 'admin-service',
  },
  transports: [
    new WinstonGraylog2({
      name: 'Graylog',
      level: 'info',
      silent: false,
      handleExceptions: true,
      exceptionsLevel: 'error',
      graylog: {
        servers: [{ host: 'graylog.huridata.org', port: 12201 }],
        hostname: os.hostname(),
        facility: 'preserve-api',
      },
      // staticMeta: { env: config.ENVIRONMENT },
    }),
    new transports.Console(),
  ],
};

const loggerFactory = (): Logger => {
  if (config.ENVIRONMENT === 'development') {
    return createLogger(logConfiguration);
  }

  return createLogger(productionConfiguration);
};

const logger = loggerFactory();

export { logger };
