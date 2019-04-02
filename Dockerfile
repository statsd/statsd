FROM node:10.15.3-alpine

RUN \
  cp -v exampleConfig.js config.js && \
  sed -i 's/graphite.example.com/graphite/' config.js

EXPOSE 8125/udp
EXPOSE 8126

ENTRYPOINT [ "node", "stats.js", "config.js" ]
