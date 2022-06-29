import { Collection, Db, ObjectId } from 'mongodb';
import { User } from '../types';

export class UsersRepository {
  private collection: Collection<User>;

  constructor(db: Db) {
    this.collection = db.collection<User>('users');
  }

  async create(token: string) {
    const _id = new ObjectId();
    await this.collection.insertOne({ _id, token });

    return this.collection.findOne({ _id });
  }
}
