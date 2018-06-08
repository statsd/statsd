FROM node:5-onbuild
VOLUME /etc/statsd/
COPY exampleConfig.js /etc/statsd/config.js
RUN \
  sed -i 's/graphite.example.com/graphite/' /etc/statsd/config.js

EXPOSE 8125/UDP
EXPOSE 8126
RUN  apt-get -y update && \
       apt-get -y install --no-install-recommends \
       netcat=1.10-41 \
       && apt-get clean \
       && rm -rf /var/lib/apt/lists/*

CMD [ "node", "stats.js", "/etc/statsd/config.js" ]
HEALTHCHECK --interval=30s --timeout=2s --retries=3 CMD  nc -vv -z -u 127.0.0.1 8125
