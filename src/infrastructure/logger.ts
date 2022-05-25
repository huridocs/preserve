// eslint-disable-next-line @typescript-eslint/no-var-requires
const winston = require('winston');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WinstonGraylog2 = require('winston-graylog2');
import * as os from 'os';
import { config } from '../config';

const logConfiguration = {
  transports: [new winston.transports.Console()],
};

const productionConfiguration = {
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
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

const loggerFactory = () => {
  if (config.ENVIRONMENT === 'development') {
    return winston.createLogger(logConfiguration);
  }

  return winston.createLogger(productionConfiguration);
};

const logger = loggerFactory();

export { logger };
