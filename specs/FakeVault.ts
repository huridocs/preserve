import { Db } from 'mongodb';
import { Vault } from 'src/Vault';

export class FakeVault extends Vault {
  constructor(db: Db) {
    super(db);
  }

  async create() {
    return Promise.reject(new Error('Something went wrong with evidence creation'));
  }

  async getOne() {
    return Promise.reject(new Error('Something went wrong with evidence retrieval'));
  }

  async getByUser() {
    return Promise.reject(new Error('Something went wrong with evidence retrieval by user'));
  }

  async processingNext() {
    return Promise.reject(new Error('Something went wrong with evidence processing next'));
  }

  async update() {
    return Promise.reject(new Error('Something went wrong with evidence update'));
  }
}
