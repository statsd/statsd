#!/bin/bash

set -xe

### The dir for the package script
MY_DIR=$(dirname $0)
cd $MY_DIR
rm -fr *.deb

### Name of the package, project, etc
NAME=statsd

### package version
VERSION=$(jq -r '.version' < package.json)
PACKAGE_VERSION=$VERSION~$(date -u +%Y%m%d%H%M)
PACKAGE_NAME=$NAME

### List of files to package
FILES="utils/ backends/ bin/ node_modules/ lib/ servers/ stats.js"

### Where this package will be installed
DEST_DIR="/usr/local/${NAME}/"

### Install the node modules
npm install --production
npm install statsd-jutgraphite-backend

### run fpm
fpm -s dir -t deb -a all -n $PACKAGE_NAME -v $PACKAGE_VERSION -d "nodejs" --prefix $DEST_DIR $FILES
