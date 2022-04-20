import { Collection, Db, ObjectId } from 'mongodb';
import { PreservationDB } from './Api';
import { User } from './authMiddleware';
import { JobResults } from './QueueProcessor';

export class Preservations {
  private collection: Collection<PreservationDB>;
  constructor(db: Db) {
    this.collection = db.collection<PreservationDB>('preservations');
  }

  async create(url: string, user: User) {
    const _id = new ObjectId();
    await this.collection.insertOne({
      _id: _id,
      attributes: { url: url, user: user._id, status: 'SCHEDULED', downloads: [] },
    });
    const preservation = await this.getOne(_id, user);
    if (!preservation) {
      throw new Error('Something went wrong with preservation creation');
    }
    return preservation;
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

  async update(_id: ObjectId, data: Partial<PreservationDB>) {
    await this.collection.updateOne({ _id }, { $set: data });
  }
}
