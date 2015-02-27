#!/bin/bash

set -xe

### The dir for the package script
MY_DIR=$(dirname $0)
cd $MY_DIR
rm -fr *.deb

### Name of the package, project, etc
NAME=statsd

### package version
VERSION=$(grep version package.json | sed 's/.*"version":[^"]*"\([^"]*\)",.*/\1/')
PACKAGE_VERSION=$VERSION~$(date -u +%Y%m%d%H%M)
PACKAGE_NAME=$NAME

### List of files to package
FILES="utils/ backends/ bin/ node_modules/ lib/ servers/ stats.js"

### Where this package will be installed
DEST_DIR="/usr/local/${NAME}/"

### Install the node modules
npm install --production

### run fpm
fpm -s dir -t deb -a all -n $PACKAGE_NAME -v $PACKAGE_VERSION -d "nodejs" --prefix $DEST_DIR $FILES
