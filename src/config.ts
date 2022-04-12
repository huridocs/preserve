import { version } from '../package.json';

export const config = {
  mongodb_uri: 'mongodb://localhost:27019',
  data_path: `${__dirname}/../downloads/`,
  sentry: {
    dsn: process.env.SENTRY_VAULT_API_DSN,
    tracesSampleRate: 0.1,
  },
  ENVIRONMENT: process.env.ENVIRONMENT || 'development',
  VERSION: process.env.ENVIRONMENT ? version : `development-${version}`,
  PORT: 4000,
};
