import { connectDB, disconnectDB } from '../src/DB';
import request from 'supertest';
import waitForExpect from 'wait-for-expect';
import { setupApp, startJobs, stopJobs } from '../src/setupApp';
import { Application } from 'express';
import { Db, ObjectId } from 'mongodb';

const DB_CONN_STRING = 'mongodb://localhost:29017';
const DB_NAME = 'huridocs-vault';

describe('Preserve API', () => {
  let app: Application;

  const post = (data: { url?: string } = {}, token = 'my_private_token') =>
    request(app)
      .post('/api/preservations')
      .send(data.url ? data : { url: 'test-url' })
      .set({ Authorization: token });

  const get = (url = '/api/preservations', token = 'my_private_token') =>
    request(app).get(url).set({ Authorization: token });

  let db: Db;
  const user1Id = new ObjectId();
  const job = async () => new Promise(resolve => setTimeout(resolve, 1000));

  beforeAll(async () => {
    db = (await connectDB(DB_CONN_STRING)).db(DB_NAME);
    app = setupApp(db);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('/api/health', () => {
    it('should respond with a 200', async () => {
      await request(app).get('/api/health').expect(200);
    });
  });

  describe('/api/preservations', () => {
    beforeEach(async () => {
      await db.collection('preservations').deleteMany({});
      await db.collection('users').deleteMany({});
      await db.collection('users').insertOne({ _id: user1Id, token: 'my_private_token' });
      await db.collection('users').insertOne({ token: 'another_token' });
    });

    it('should return 401 when not authorized', async () => {
      await get('/api/preservations', null).expect(401);
      await get('/api/preservations', 'invalid_token').expect(401);
    });

    it('should return 404 when requesting an existing job with an invalid token', async () => {
      const { body: newPreservation } = await post().expect(202);
      await get(newPreservation.links.self, 'another_token').expect(404);
    });

    it('should respond 404 when job not found', async () => {
      await get('/api/preservations/non_existent').expect(404);
    });

    it('should return only jobs authorized for the token sent', async () => {
      await post().expect(202);
      await post({}, 'another_token').expect(202);

      const { body: preservation } = await get().expect(200);

      expect(preservation).toMatchObject([
        {
          user: user1Id.toString(),
          status: 'SCHEDULED',
        },
      ]);
    });

    it('should respond with 202, and return job information', async () => {
      const { body: newPreservation } = await post({ url: 'http://my-url' }).expect(202);

      const { body: preservation } = await get(newPreservation.links.self).expect(200);

      expect(preservation).toMatchObject({
        ...newPreservation.data,
        url: 'http://my-url',
        status: 'SCHEDULED',
      });
    });

    it('should set the job to PROCESSING', async () => {
      const { body: newPreservation } = await post().expect(202);

      startJobs(job, 0);
      await waitForExpect(async () => {
        const { body } = await get(newPreservation.links.self).expect(200);

        expect(body).toMatchObject({
          ...newPreservation.data,
          status: 'PROCESSING',
        });
      });
      await stopJobs();
    });

    it('should process the job', async () => {
      const { body: newPreservation } = await post().expect(202);

      startJobs(job, 0);
      await waitForExpect(async () => {
        const { body } = await get(newPreservation.links.self).expect(200);

        expect(body).toMatchObject({
          ...newPreservation.data,
          status: 'PROCESSED',
        });
      });
      await stopJobs();
    });
  });
});
