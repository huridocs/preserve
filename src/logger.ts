import { createLogger, transports } from 'winston';

const logConfiguration = {
  transports: [new transports.Console()],
};

export default createLogger(logConfiguration);
