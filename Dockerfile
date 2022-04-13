FROM node:14.18.3

RUN apt-get update && apt-get install -y  \
    libxss1 \
    libgconf-2-4 \
    default-jre \
    gosu \
    && rm -rf /var/lib/apt/lists/*

RUN curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl && \
     chmod a+rx /usr/local/bin/youtube-dl

USER node

RUN mkdir -p /home/node/app
WORKDIR /home/node/app

COPY --chown=node:node package.json ./
RUN yarn install
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src/ ./src
RUN yarn build
RUN yarn install --prod
RUN rm -fr ./src ./specs
RUN mv -f ./dist/* ./
RUN rm -fr ./dist

EXPOSE 4000

CMD ["node", "src/server.js"]
