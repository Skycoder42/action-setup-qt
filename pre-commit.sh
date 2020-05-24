#!/bin/sh
set -ex

yarn pretty-quick --staged
yarn build
rm -rf node_modules
yarn install --production
git add node_modules/*
