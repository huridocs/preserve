FROM ghcr.io/huridocs/preserve-base:latest AS base

USER node

COPY --chown=node:node entrypoint.sh worker-entrypoint.sh /home/node/
RUN chmod +x /home/node/entrypoint.sh /home/node/worker-entrypoint.sh

FROM base AS production
COPY --chown=node:node src/ ./src
RUN yarn build && yarn install --prod
RUN rm -fr ./src && mv -f ./dist/* ./ && rm -fr ./dist ./specs
ENV NODE_ENV=production

FROM base AS testing
COPY --chown=node:node specs/ ./specs
COPY --chown=node:node jest.config.js setupJest.ts ./
ENV NODE_ENV=development
