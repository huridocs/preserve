#!/bin/bash

USERID=${USER_ID:-9001}
GROUPID=${GROUP_ID:-9001}
echo "Starting with UID: $USERID, GID: $GROUPID"
useradd -u "$USERID" -o -m user
groupmod -g "$GROUPID" user
chown user:user /home/user/app
chown user:user /home/user
export HOME=/home/user

if [ "$NODE_ENV" = "production" ]; then
  exec /usr/sbin/gosu user node src/server.js
else
  exec /usr/sbin/gosu user yarn dev
fi
