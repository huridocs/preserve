import { Db, MongoClient } from 'mongodb';
import { config } from '../config';

const DB_NAME = 'preserve';

let client: MongoClient;
let db: Db;

const connectDB = async (db_name = DB_NAME, uri = config.mongodb_uri) => {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(db_name);
  return db;
};

const disconnectDB = async () => {
  await client.close();
};

export { connectDB, disconnectDB, db };
