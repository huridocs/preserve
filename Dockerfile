FROM node:14.18.3

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
RUN yarn install
COPY tsconfig.json ./
COPY src/ ./src
RUN yarn build
RUN yarn install --prod
RUN rm -fr ./src ./specs
RUN mv -f ./dist/* ./
RUN rm -fr ./dist

EXPOSE 4000

COPY entrypoint.sh /bin/entrypoint.sh
RUN chmod +x /bin/entrypoint.sh
ENTRYPOINT ["/bin/entrypoint.sh"]
