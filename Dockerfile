FROM ghcr.io/huridocs/preserve-base:latest AS base

FROM base AS production
COPY src/ ./src
RUN yarn build && yarn install --prod
RUN rm -fr ./src && mv -f ./dist/* ./ && rm -fr ./dist ./specs
ENV NODE_ENV=production

FROM base AS testing
COPY specs/ ./specs
COPY jest.config.js setupJest.ts ./
ENV NODE_ENV=development
