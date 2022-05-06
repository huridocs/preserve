import { version } from '../package.json';

export const config = {
  evidences_return_max_limit: 50,
  mongodb_uri: process.env.MONGO_URI || 'mongodb://localhost:27019',
  data_path: `${__dirname}/../downloads/`,
  sentry: {
    dsn: process.env.SENTRY_VAULT_API_DSN,
    tracesSampleRate: 0.1,
  },
  logger: { host: 'graylog.huridata.org', port: 12201 },
  ENVIRONMENT: process.env.ENVIRONMENT || 'development',
  VERSION: process.env.ENVIRONMENT ? version : `development-${version}`,
  PORT: 4000,
};
