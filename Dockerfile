FROM node:16-alpine3.12

# Setup node envs
ENV NODE_ENV production

USER node
WORKDIR /usr/src/app

# Install dependencies
COPY . .
RUN npm ci --only=production

# Expose required ports
EXPOSE 8125/udp
EXPOSE 8126

# Start statsd
ENTRYPOINT ["npm", "run", "start"]
