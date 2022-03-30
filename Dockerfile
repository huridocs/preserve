FROM node:14

RUN apt-get update
RUN apt-get install -y libxss1
RUN apt-get install -y libgconf-2-4
RUN apt-get install -y default-jre
RUN apt-get install -y tesseract-ocr
RUN apt-get install -y tesseract-ocr-deu
RUN apt-get install -y tesseract-ocr-eng
RUN apt-get install -y tesseract-ocr-fra
RUN apt-get install -y tesseract-ocr-spa
RUN apt-get install -y tesseract-ocr-deu
RUN apt-get install -y tesseract-ocr-ara
RUN apt-get install -y tesseract-ocr-mya
RUN apt-get install -y tesseract-ocr-hin
RUN apt-get install -y tesseract-ocr-tam
RUN apt-get install -y tesseract-ocr-tha
RUN apt-get install -y tesseract-ocr-chi-sim
RUN curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl && \
     chmod a+rx /usr/local/bin/youtube-dl

RUN apt-get -y install gosu

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

