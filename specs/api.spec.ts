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
  let db: Db;
  const user1Id = new ObjectId();
  const job = async () => new Promise(resolve => setTimeout(resolve, 1000));

  beforeAll(async () => {
    db = (await connectDB(DB_CONN_STRING)).db(DB_NAME);
    app = setupApp(db);
  });

  beforeEach(async () => {
    await db.collection('preservations').deleteMany({});
    await db.collection('users').deleteMany({});
    await db.collection('users').insertOne({ _id: user1Id, token: 'my_private_token' });
    await db.collection('users').insertOne({ token: 'another_token' });
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
    it('should return 401 when not authorized', async () => {
      await request(app).get('/api/preservations').expect(401);
      await request(app)
        .get('/api/preservations')
        .set({ Authorization: 'invalid_token' })
        .expect(401);
    });

    it('should return 404 when requesting an existing job with an invalid token', async () => {
      const { body: newPreservation } = await request(app)
        .post('/api/preservations')
        .set({ Authorization: 'my_private_token' })
        .expect(202);

      await request(app)
        .get(newPreservation.url)
        .set({ Authorization: 'another_token' })
        .expect(404);
    });

    it('should respond 404 when job not found', async () => {
      await request(app)
        .get('/api/preservations/non_existent')
        .set({ Authorization: 'my_private_token' })
        .expect(404);
    });

    it('should return only jobs authorized for the token sent', async () => {
      await request(app)
        .post('/api/preservations')
        .set({ Authorization: 'my_private_token' })
        .expect(202);

      await request(app)
        .post('/api/preservations')
        .set({ Authorization: 'another_token' })
        .expect(202);

      const { body: preservation } = await request(app)
        .get('/api/preservations')
        .set({ Authorization: 'my_private_token' })
        .expect(200);

      expect(preservation).toMatchObject([
        {
          user: user1Id.toString(),
          status: 'SCHEDULED',
        },
      ]);
    });

    it('should respond with 202, and return job information', async () => {
      const { body: newPreservation } = await request(app)
        .post('/api/preservations')
        .set({ Authorization: 'my_private_token' })
        .expect(202);

      const { body: preservation } = await request(app)
        .get(newPreservation.url)
        .set({ Authorization: 'my_private_token' })
        .expect(200);

      expect(preservation).toMatchObject({
        ...newPreservation,
        status: 'SCHEDULED',
      });
    });

    it('should set the job to PROCESSING', async () => {
      const { body: newPreservation } = await request(app)
        .post('/api/preservations')
        .set({ Authorization: 'my_private_token' })
        .expect(202);

      startJobs(job, 0);
      await waitForExpect(async () => {
        const { body } = await request(app)
          .get(newPreservation.url)
          .set({ Authorization: 'my_private_token' })
          .expect(200);

        expect(body).toMatchObject({
          ...newPreservation,
          status: 'PROCESSING',
        });
      });
      await stopJobs();
    });

    it('should process the job', async () => {
      const { body: newPreservation } = await request(app)
        .post('/api/preservations')
        .set({ Authorization: 'my_private_token' })
        .expect(202);

      startJobs(job, 0);
      await waitForExpect(async () => {
        const { body } = await request(app)
          .get(newPreservation.url)
          .set({ Authorization: 'my_private_token' })
          .expect(200);

        expect(body).toMatchObject({
          ...newPreservation,
          status: 'PROCESSED',
        });
      });
      await stopJobs();
    });
  });
});
