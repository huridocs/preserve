import { MongoClient } from 'mongodb';

let client: MongoClient;

const connectDB = async (uri: string) => {
  client = new MongoClient(uri);
  await client.connect();
  return client;
};

const disconnectDB = async () => {
  await client.close();
};

export { connectDB, disconnectDB };
