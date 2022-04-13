#!/bin/bash

USERID=${USER_ID:-9001}
GROUPID=${GROUP_ID:-9001}
echo "Starting with UID: $USERID, GID: $GROUPID"
useradd -u "$USERID" -o -m user
groupmod -g "$GROUPID" user
chown user:user /home/user/app
chown user:user /home/user/app/node_modules/@sugarcube/utils/_dist/
export HOME=/home/user
export NODE_ENV=production

exec /usr/sbin/gosu user node src/server.js
