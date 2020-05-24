#!/bin/sh
set -ex

yarn pretty-quick --staged
rm -rf lib
yarn build
rm -rf node_modules
yarn install --production
git add lib node_modules
