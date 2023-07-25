FROM node:18.12.1 AS base

RUN apt-get update && apt-get install curl gnupg gosu -y \
  && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install google-chrome-stable -y --no-install-recommends \
  && apt-get install ffmpeg -y --no-install-recommends \
  && apt-get install python-is-python3 fonts-indic fonts-noto fonts-noto-cjk fonts-arabeyes fonts-kacst fonts-freefont-ttf -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp  \
  && chmod a+rx /usr/local/bin/yt-dlp

USER node

RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY --chown=node:node package.json yarn.lock tsconfig.json ./
RUN yarn install

EXPOSE 4000
