import { Application } from 'express';
import { appendFile, mkdir } from 'fs/promises';
import { Db, ObjectId } from 'mongodb';
import { connectDB, disconnectDB } from 'src/DB';
import { JobFunction, PreservationDB, setupApp, startJobs, stopJobs } from 'src/setupApp';
import request from 'supertest';
import waitForExpect from 'wait-for-expect';

const DB_CONN_STRING = 'mongodb://localhost';
const timeout = (miliseconds: number) => new Promise(resolve => setTimeout(resolve, miliseconds));

describe('Preserve API', () => {
  let app: Application;

  const post = (
    data: { url?: any; type?: 'preservations' } = { url: 'test-url' },
    token = 'my_private_token'
  ) => {
    data.type = data.type || 'preservations';
    return request(app).post('/api/preservations').send(data).set({ Authorization: token });
  };

  const get = (url = '/api/preservations', token: string | null = 'my_private_token') =>
    request(app).get(url).set({ Authorization: token });

  let db: Db;
  const user1Id = new ObjectId();

  const job: JobFunction = async (preservation: PreservationDB) => {
    await timeout(100);
    await mkdir(`${__dirname}/data/${preservation._id}`);
    await appendFile(`${__dirname}/data/${preservation._id}/screenshot.jpg`, 'screenshot');
    await appendFile(`${__dirname}/data/${preservation._id}/video.mp4`, 'video');
    return {
      downloads: {
        screenshots: [`/preservations/${preservation._id}/screenshot.jpg`],
        video: `/preservations/${preservation._id}/video.mp4`,
      },
    };
  };

  beforeAll(async () => {
    db = await connectDB(DB_CONN_STRING);
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

    it('should respond 404 when job not found', async () => {
      await get('/api/preservations/non_existent').expect(404);
    });

    it('should respond with 202, and return job information', async () => {
      const { body: newPreservation } = await post({ url: 'http://my-url' }).expect(202);

      const { body: preservation } = await get(newPreservation.links.self).expect(200);

      expect(preservation).toMatchObject({
        data: {
          attributes: {
            ...newPreservation.data.attributes,
            url: 'http://my-url',
            status: 'SCHEDULED',
          },
        },
      });
    });

    it('should set the job to PROCESSING', async () => {
      const { body: newPreservation } = await post().expect(202);

      startJobs(job, 0);
      await waitForExpect(async () => {
        const { body } = await get(newPreservation.links.self).expect(200);

        expect(body).toMatchObject({
          data: {
            id: newPreservation.id,
            attributes: {
              ...newPreservation.data.attributes,
              status: 'PROCESSING',
            },
          },
        });
      });
      await stopJobs();
    });

    it('should process the job', async () => {
      const { body: newPreservation } = await post().expect(202);

      startJobs(job, 0);
      await stopJobs();

      const { body } = await get(newPreservation.links.self).expect(200);
      expect(body).toMatchObject({
        data: {
          id: newPreservation.id,
          attributes: {
            ...newPreservation.data.attributes,
            status: 'PROCESSED',
            downloads: {
              screenshots: [`/preservations/${newPreservation.id}/screenshot.jpg`],
              video: `/preservations/${newPreservation.id}/video.mp4`,
            },
          },
        },
      });
    });

    it('should be able to download files on the processed job', async () => {
      const { body: newPreservation } = await post().expect(202);

      startJobs(job, 0);
      await stopJobs();
      const { body } = await get(newPreservation.links.self).expect(200);

      const screenshot = await get(body.data.attributes.downloads.screenshots[0]).expect(200);
      expect(screenshot.body.toString()).toBe('screenshot');
      const video = await get(body.data.attributes.downloads.video).expect(200);
      expect(video.body.toString()).toBe('video');
    });

    describe('Validation', () => {
      describe('POST', () => {
        it('should respond 400 when no url passed', async () => {
          await post({}).expect(400);
          await post({ url: 4 }).expect(400);
        });
        it('should not add any job when validation fails', async () => {
          await post({}).expect(400);
          let { body } = await get().expect(200);
          expect(body).toMatchObject({ data: [] });

          await post({ url: 4 }).expect(400);
          ({ body } = await get().expect(200));
          expect(body).toMatchObject({ data: [] });
        });
      });
    });

    describe('Authorization', () => {
      it('should respond 401 when not authorized', async () => {
        await get('/api/preservations', null).expect(401);
        await get('/api/preservations', 'invalid_token').expect(401);
      });

      it('should respond 404 when requesting an existing job with an invalid token', async () => {
        const { body: newPreservation } = await post().expect(202);
        await get(newPreservation.links.self, 'another_token').expect(404);
      });

      it('should respond 404 when trying to download files belonging to another token', async () => {
        const { body: newPreservation } = await post().expect(202);

        startJobs(job, 0);
        await stopJobs();

        const { body } = await get(newPreservation.links.self).expect(200);
        await get(body.data.attributes.downloads.screenshots[0], 'another_token').expect(404);
        await get(body.data.attributes.downloads.video, 'another_token').expect(404);
      });

      it('should respond only jobs authorized for the token sent', async () => {
        const { body: newPreservation } = await post({ url: 'http://my-url' }).expect(202);
        await post({ url: 'http://another-url' }, 'another_token').expect(202);

        const { body: preservation } = await get().expect(200);

        expect(preservation).toMatchObject({
          data: [
            {
              id: newPreservation.id,
              attributes: {
                url: 'http://my-url',
                status: 'SCHEDULED',
              },
            },
          ],
        });
      });
    });
  });
});
