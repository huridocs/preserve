import { Db, ObjectId } from 'mongodb';
import { CreateEvidence } from 'src/actions/CreateEvidence';
import { Vault } from 'src/Vault';
import { connectDB, disconnectDB } from 'src/DB';
import { fakeLogger } from 'specs/fakeLogger';
import { User } from 'src/types';
import { Cookie } from 'src/types';

describe('Create evidence', () => {
  let db: Db;
  let vault: Vault;
  let action: CreateEvidence;
  let user: User;
  const userId = new ObjectId();

  beforeAll(async () => {
    db = await connectDB('preserve-api-testing');
    vault = new Vault(db);
  });

  beforeEach(async () => {
    await db.collection('users').insertOne({ _id: userId, token: 'my_private_token' });
    action = new CreateEvidence(vault, fakeLogger);
    user = { _id: userId, token: 'my_private_token' };
  });

  afterEach(async () => {
    await db.collection('evidences').deleteMany({});
    await db.collection('users').drop();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('creates an scheduled evidence for a user', () => {
    it('for an URL without cookies', async () => {
      const evidence = await action.execute('http://example.com', user, undefined);

      expect(evidence).toMatchObject({
        attributes: {
          downloads: [],
          status: 'SCHEDULED',
          url: 'http://example.com',
        },
        user: userId,
        cookies: [],
      });
    });

    it('for an URL with cookies', async () => {
      const cookies: Cookie[] = [
        {
          domain: '.github.com',
          expirationDate: 1672732978.838891,
          hostOnly: false,
          httpOnly: false,
          name: '_octo',
          path: '/',
          sameSite: 'Lax',
          secure: true,
          session: false,
          storeId: '0',
          value: 'GH1.1.129557744.1641196970',
        },
        {
          domain: 'github.com',
          expirationDate: 1672732974.3706,
          hostOnly: true,
          httpOnly: true,
          name: '_device_id',
          path: '/',
          sameSite: 'Lax',
          secure: true,
          session: false,
          storeId: '0',
          value: '23ab1e1531b57acd1b2fe51859950d0b',
        },
      ];
      const evidence = await action.execute('http://example.com', user, cookies);

      expect(evidence).toMatchObject({
        attributes: {
          downloads: [],
          status: 'SCHEDULED',
          url: 'http://example.com',
        },
        user: userId,
        cookies: cookies,
      });
    });
  });
});
