import { Db, ObjectId } from 'mongodb';
import { connectDB, disconnectDB } from '../../src/infrastructure/DB';
import { UsersRepository } from '../../src/infrastructure/UsersRepository';

describe('Users repository', () => {
  let db: Db;
  beforeAll(async () => {
    db = await connectDB('preserve-api-testing');
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('should create users', async () => {
    const repo = new UsersRepository(db);

    const user = await repo.create('token');

    expect(user).toEqual({
      _id: expect.any(ObjectId),
      token: 'token',
    });
  });
});
