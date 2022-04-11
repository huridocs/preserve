FROM node:14

RUN apt-get update && apt-get install -y  \
    libxss1 \
    libgconf-2-4 \
    default-jre \
#     tesseract-ocr \
#     tesseract-ocr-deu tesseract-ocr-eng  \
#     tesseract-ocr-fra  \
#     tesseract-ocr-spa  \
#     tesseract-ocr-deu  \
#     tesseract-ocr-ara  \
#     tesseract-ocr-mya  \
#     tesseract-ocr-hin  \
#     tesseract-ocr-tam  \
#     tesseract-ocr-tha  \
#     tesseract-ocr-chi-sim  \
    gosu \
    && rm -rf /var/lib/apt/lists/*

RUN curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl && \
     chmod a+rx /usr/local/bin/youtube-dl

RUN groupmod -g 999 node && usermod -u 999 -g 999 node

RUN mkdir -p /home/user/source
WORKDIR /home/user/source

COPY package.json ./
RUN yarn install
COPY . .

RUN mkdir -p /home/user/app

RUN yarn build

RUN mv ./dist/* /home/user/app
RUN mv ./node_modules /home/user/app

WORKDIR /home/user/app

EXPOSE 4000

# CMD [ "node", "server.js" ]
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
# ENTRYPOINT ["tail", "-f", "/dev/null"]
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

