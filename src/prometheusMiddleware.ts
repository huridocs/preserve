import promBundle from 'express-prom-bundle';
import { config } from './config';

export const prometheusMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  customLabels: {
    port: config.PORT,
    env: config.ENVIRONMENT,
  },
  promClient: {
    collectDefaultMetrics: {},
  },
});
