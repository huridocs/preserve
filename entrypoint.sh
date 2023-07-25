#!/bin/bash

if [ "$NODE_ENV" = "production" ]; then
  exec node src/server.js
else
  exec yarn dev
fi
