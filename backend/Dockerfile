# version of docker node JS image we use as a base
FROM node:17.1

USER root

# create dirs
WORKDIR /home/node/app
RUN chown -R node:node /root
RUN chown -R node:node /home/node/app
RUN mkdir -p /home/node/app/backend
RUN chown -R node:node /home/node/app/backend
RUN mkdir -p /home/node/app/backend/node_modules
RUN chown -R node:node /home/node/app/backend/node_modules

# backend node dependencies install
COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json
RUN npm install --production
#RUN npm audit fix              // no audit here....
RUN npm cache clean --force

# copy backend
WORKDIR /home/node/app/backend
COPY ./node ./node
COPY ./assets ./assets
COPY ./server.js ./server.js
COPY ./robots.txt ./robots.txt

EXPOSE 8080

CMD ["sh", "-c", "node server.js "]