FROM node:16-alpine3.12

# Setup node envs
ENV NODE_ENV production

WORKDIR /usr/src/app

# Install dependencies
COPY --chown=node:node . .
RUN npm ci --only=production

# Generate a config file
RUN ["node", "./utils/writeConfig.js"] 

# Expose required ports
EXPOSE 8125/udp
EXPOSE 8126

# Start statsd
USER node
ENTRYPOINT [ "node", "stats.js", "config.js" ]
