#!/bin/bash

if [ "$NODE_ENV" = "production" ]; then
  exec node src/worker.js
else
  exec yarn worker
fi
