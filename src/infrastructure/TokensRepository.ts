import { Collection, Db, ObjectId } from 'mongodb';
import { TokenDB } from '../types';

export class TokensRepository {
  private collection: Collection<TokenDB>;

  constructor(db: Db) {
    this.collection = db.collection<TokenDB>('tokens');
  }

  async save(token: string) {
    const _id = new ObjectId();
    await this.collection.insertOne({ _id, token });

    return this.collection.findOne({ _id });
  }
}
