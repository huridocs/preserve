#!/bin/bash

USERID=${USER_ID:-9001}
GROUPID=${GROUP_ID:-9001}

echo "Starting with UID: $USERID, GID: $GROUPID"
useradd -u "$USERID" -o -m user
groupmod -g "$GROUPID" user
chown -R user:user /home/user
export HOME=/home/user

# exec /usr/sbin/gosu user node src/server.ts
exec /usr/sbin/gosu user node src/server.js
