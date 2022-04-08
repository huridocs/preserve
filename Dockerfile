FROM node:14

RUN apt-get update
RUN apt-get install -y libxss1 libgconf-2-4 default-jre tesseract-ocr tesseract-ocr-deu tesseract-ocr-eng  \
    tesseract-ocr-fra tesseract-ocr-spa tesseract-ocr-deu tesseract-ocr-ara tesseract-ocr-mya tesseract-ocr-hin  \
    tesseract-ocr-tam tesseract-ocr-tha tesseract-ocr-chi-sim gosu

RUN curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl && \
     chmod a+rx /usr/local/bin/youtube-dl

RUN groupmod -g 999 node && usermod -u 999 -g 999 node

RUN mkdir -p /home/user/app
WORKDIR /home/user/app

COPY package.json ./
RUN yarn install

COPY . .
EXPOSE 4000

# CMD [ "node", "server.js" ]
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

