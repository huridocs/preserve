import { version } from '../package.json';

export const config = {
  freetsa: {
    pemFile: `${__dirname}/../files/freetsa/cacert.pem`,
    crtFile: `${__dirname}/../files/freetsa/tsa.crt`,
  },
  data_path: `${__dirname}/../files/downloads/`,
  cookiesPath: `${__dirname}/../files/cookies/`,
  trusted_timestamps_path: `${__dirname}/../files/trusted_timestamps/`,
  evidences_return_max_limit: 50,
  mongodb_uri: process.env.MONGO_URI || 'mongodb://localhost:27019',
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
