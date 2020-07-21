FROM node:10.20.1

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install python
# RUN apk add --no-cache --update g++ gcc libgcc libstdc++ linux-headers make python

# Setup node envs
ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

ARG your_application_Insights_Instrumentation_Key
ENV your_application_Insights_Instrumentation_Key "0e7e5a42-4ff6-4102-91b5-f38bbad6dadf"

ARG my_prefix
ENV my_prefix "test1"


# Install dependencies
COPY package.json /usr/src/app/
RUN npm install && npm cache clean --force

# Copy required src (see .dockerignore)
COPY . /usr/src/app

# set application insights backend config
RUN \
  ls -la && \
  cp -v appinsightsConfig.js config.js && \
  sed -i "s|your_application_Insights_Instrumentation_Key|${your_application_Insights_Instrumentation_Key}|" config.js && \
  sed -i "s|my_prefix|${my_prefix}|" config.js
  

# Expose required ports
EXPOSE 8125/udp
EXPOSE 8126

# Start statsd
ENTRYPOINT [ "node", "stats.js", "config.js" ]
