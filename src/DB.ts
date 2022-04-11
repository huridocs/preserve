import { Db, MongoClient } from 'mongodb';

const DB_NAME = 'huridocs-vault';

let client: MongoClient;
let db: Db;

const connectDB = async (uri: string, db_name = DB_NAME) => {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(db_name);
  return db;
};

const disconnectDB = async () => {
  await client.close();
};

export { connectDB, disconnectDB, db };
