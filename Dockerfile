FROM node:21-alpine3.19

WORKDIR /usr/src/app

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package.json ./
COPY package-lock.json ./

RUN npm install

COPY . .

EXPOSE 3002