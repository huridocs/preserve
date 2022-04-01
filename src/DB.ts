import { Db, MongoClient } from 'mongodb';

const DB_NAME = 'huridocs-vault';

let client: MongoClient;
let db: Db;

const connectDB = async (uri: string) => {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(DB_NAME);
  return db;
};

const disconnectDB = async () => {
  await client.close();
};

export { connectDB, disconnectDB, db };
