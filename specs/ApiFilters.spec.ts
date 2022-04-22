import { Application } from 'express';
import { Db, ObjectId } from 'mongodb';
import { Api } from 'src/Api';
import { config } from 'src/config';
import { connectDB, disconnectDB } from 'src/DB';
import { Vault } from 'src/Vault';
import request from 'supertest';

const DB_CONN_STRING = 'mongodb://localhost:27019';

describe('Evidences endpoint pagination', () => {
  let app: Application;

  const get = (url = '/api/evidences', token: string | null = 'my_private_token') =>
    request(app).get(url).set({ Authorization: token });

  let db: Db;
  const user1Id = new ObjectId();
  const user1 = { _id: user1Id, token: 'user1' };

  beforeAll(async () => {
    config.data_path = `${__dirname}/downloads`;
    db = await connectDB(DB_CONN_STRING, 'preserve-testing-filters');
    await db.collection('evidences').deleteMany({});
    const vault = new Vault(db);
    app = Api(vault);

    const evidence1 = await vault.create('evidence1', user1);
    vault.update(evidence1._id, { attributes: { ...evidence1.attributes, date: new Date(3) } });

    const evidence2 = await vault.create('evidence2', user1);
    vault.update(evidence2._id, { attributes: { ...evidence2.attributes, date: new Date(1) } });

    const evidence3 = await vault.create('evidence3', user1);
    vault.update(evidence3._id, { attributes: { ...evidence3.attributes, date: new Date(2) } });

    await db.collection('users').deleteMany({});
    await db.collection('users').insertOne(user1);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('/api/evidences', () => {
    it('should return evidences sorted by date desc', async () => {
      const { body: evidences } = await get('/api/evidences', 'user1').expect(200);
      expect(evidences.data).toMatchObject([
        { attributes: { url: 'evidence1' } },
        { attributes: { url: 'evidence3' } },
        { attributes: { url: 'evidence2' } },
      ]);
    });

    it('should be able to filter by "greater than" a Date', async () => {
      const { body: evidences } = await get(
        `/api/evidences?filter[date][gt]=${new Date(1).toISOString()}`,
        'user1'
      ).expect(200);

      expect(evidences.data).toMatchObject([
        { attributes: { url: 'evidence1' } },
        { attributes: { url: 'evidence3' } },
      ]);
    });

    it('should only accept [date][gt] filter or nothing, return error otherwise', async () => {
      await get(`/api/evidences?filter[unsuported_property][gt]=value`, 'user1').expect(400);
      await get(`/api/evidences?filter[date][unsuported_filter]=value`, 'user1').expect(400);
    });
  });
});
