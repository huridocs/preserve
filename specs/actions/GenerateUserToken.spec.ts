import { Db, ObjectId } from 'mongodb';
import { GenerateUserToken } from '../../src/actions/GenerateUserToken';
import { connectDB } from '../../src/infrastructure/DB';
import { TokenGenerator } from '../../src/infrastructure/TokenGenerator';
import { UsersRepository } from '../../src/infrastructure/UsersRepository';

describe('GenerateUserToken', () => {
  let db: Db;
  beforeAll(async () => {
    db = await connectDB('preserve-api-testing');
  });

  afterEach(async () => {
    await db.collection('users').drop();
  });

  it('should generate a token', async () => {
    const tokenGenerator = new TokenGenerator();
    jest.spyOn(tokenGenerator, 'generate').mockReturnValue('generated-token');

    const action = new GenerateUserToken(tokenGenerator, new UsersRepository(db));

    expect(await action.execute()).toEqual('generated-token');
    expect(await db.collection('users').findOne({ token: 'generated-token' })).toEqual({
      _id: expect.any(ObjectId),
      token: 'generated-token',
    });
  });
});
