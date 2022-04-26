import { createLogger, transports } from 'winston';

const logConfiguration = {
  transports: [new transports.Console({ silent: true })],
};

const fakeLogger = createLogger(logConfiguration);

export { fakeLogger };
