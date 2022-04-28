FROM node:16.14.2 AS base

RUN apt-get update && apt-get install curl gnupg gosu -y \
  && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install google-chrome-stable -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

RUN curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl && \
     chmod a+rx /usr/local/bin/youtube-dl

RUN groupmod -g 999 node && usermod -u 999 -g 999 node

RUN mkdir -p /home/user/app
WORKDIR /home/user/app
COPY package.json ./
COPY tsconfig.json ./
RUN yarn install

COPY entrypoint.sh /bin/entrypoint.sh
RUN chmod +x /bin/entrypoint.sh

EXPOSE 4000

FROM base AS production
COPY src/ ./src
RUN yarn build && yarn install --prod
RUN rm -fr ./src && mv -f ./dist/* ./ && rm -fr ./dist ./specs
ENV NODE_ENV=production
ENTRYPOINT ["/bin/entrypoint.sh"]

FROM base AS testing
ENV NODE_ENV=development
ENTRYPOINT ["/bin/entrypoint.sh"]
