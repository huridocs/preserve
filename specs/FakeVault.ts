import { Db, Filter, ObjectId } from 'mongodb';
import { User } from 'src/authMiddleware';
import { EvidenceDB } from 'src/QueueProcessor';
import { Vault } from 'src/Vault';

export class FakeVault extends Vault {
  constructor(db: Db) {
    super(db);
  }

  async create(_url: string, _user: User) {
    return Promise.reject(new Error('Something went wrong with evidence creation'));
  }

  async getOne(_id: ObjectId, user: User) {
    return Promise.reject(new Error('Something went wrong with evidence retrieval'));
  }

  async getByUser(user: User, filter: Filter<EvidenceDB> = {}) {
    return Promise.reject(new Error('Something went wrong with evidence retrieval by user'));
  }

  async processingNext() {
    return Promise.reject(new Error('Something went wrong with evidence processing next'));
  }

  async update(_id: ObjectId, data: Partial<EvidenceDB>) {
    return Promise.reject(new Error('Something went wrong with evidence update'));
  }
}
