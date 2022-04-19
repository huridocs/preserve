FROM node:14.18.3 AS base

RUN apt-get update && apt-get install -y  \
    libxss1 \
    libgconf-2-4 \
    default-jre \
    gosu \
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
