import { Collection, Db, ObjectId } from 'mongodb';
import { EvidenceDB } from './Api';
import { User } from './authMiddleware';

export class Vault {
  private collection: Collection<EvidenceDB>;
  constructor(db: Db) {
    this.collection = db.collection<EvidenceDB>('evidences');
  }

  async create(url: string, user: User) {
    const _id = new ObjectId();
    await this.collection.insertOne({
      _id: _id,
      attributes: { url: url, user: user._id, status: 'SCHEDULED', downloads: [] },
    });
    const evidence = await this.getOne(_id, user);
    if (!evidence) {
      throw new Error('Something went wrong with evidence creation');
    }
    return evidence;
  }

  async getOne(_id: ObjectId, user: User) {
    return this.collection.findOne({ _id, 'attributes.user': user._id });
  }

  async getByUser(user: User) {
    return this.collection.find({ 'attributes.user': user._id }).toArray();
  }

  async processingNext() {
    return (
      await this.collection.findOneAndUpdate(
        { 'attributes.status': 'SCHEDULED' },
        { $set: { 'attributes.status': 'PROCESSING' } }
      )
    ).value;
  }

  async update(_id: ObjectId, data: Partial<EvidenceDB>) {
    await this.collection.updateOne({ _id }, { $set: data });
  }
}
