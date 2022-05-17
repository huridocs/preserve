import { version } from '../package.json';

export const config = {
  evidences_return_max_limit: 50,
  freetsa: {
    pemFile: `${__dirname}/../files/freetsa/cacert.pem`,
    crtFile: `${__dirname}/../files/freetsa/tsa.crt`,
  },
  mongodb_uri: process.env.MONGO_URI || 'mongodb://localhost:27019',
  data_path: `${__dirname}/../downloads/`,
  trusted_timestamps_path: `${__dirname}/../trusted_timestamps/`,
  sentry: {
    api_dsn: process.env.SENTRY_PRESERVE_API_DSN,
    worker_dsn: process.env.SENTRY_PRESERVE_WORKER_DSN,
    tracesSampleRate: 0.1,
  },
  video_downloader_path: process.env.VIDEO_DOWNLOADER_PATH || '/usr/local/bin/yt-dlp',
  logger: { host: 'graylog.huridata.org', port: 12201 },
  ENVIRONMENT: process.env.ENVIRONMENT || 'development',
  VERSION: process.env.ENVIRONMENT ? version : `development-${version}`,
  PORT: 4000,
};
