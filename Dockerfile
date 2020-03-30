FROM node:carbon
ADD . /home/node/app
WORKDIR /home/node/app
ENV NODE_ENV production
ENTRYPOINT node ./dist/main.js
