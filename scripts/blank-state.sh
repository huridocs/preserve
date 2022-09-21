#!/bin/bash

DB=${1:-${DATABASE_NAME:-preserve}}
HOST=${2:-${DBHOST:-127.0.0.1}}
PORT=${2:-${DBPORT:-27019}}

echo -e "\n\nDeleting $DB database on $HOST"
mongo -host $HOST:$PORT $DB --eval "db.dropDatabase()"
echo -e "\n\nPopulating authorization collection"
mongo -host $HOST:$PORT $DB --eval "db.createCollection('authorization')"
HASH=$(openssl rand -hex 16)
mongo -host $HOST:$PORT $DB --eval "db.authorization.insertOne({ token: '$HASH' })"
echo -e "Main authorization token created: $HASH"
