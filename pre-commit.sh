#!/bin/sh
set -ex

yarn pretty-quick --staged
rm -rf lib
yarn build
git add lib
if ! git diff --name-only --cached --exit-code package.json yarn.lock; then
  rm -rf node_modules
  yarn install --production
  git add node_modules
fi
