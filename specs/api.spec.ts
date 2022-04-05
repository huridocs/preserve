import { connectDB, disconnectDB } from '../src/DB';
import request from 'supertest';
import waitForExpect from 'wait-for-expect';
import { JobFunction, PreservationDB, setupApp, startJobs, stopJobs } from '../src/setupApp';
import { Application } from 'express';
import { Db, ObjectId } from 'mongodb';
import { appendFile, mkdir } from 'fs/promises';

const DB_CONN_STRING = 'mongodb://localhost';
const timeout = (miliseconds: number) => new Promise(resolve => setTimeout(resolve, miliseconds));

describe('Preserve API', () => {
  let app: Application;

  const post = (
    data: { url?: string; type?: 'preservations' } = {},
    token = 'my_private_token'
  ) => {
    data.type = data.type || 'preservations';
    return request(app)
      .post('/api/preservations')
      .send(data.url ? data : { url: 'test-url' })
      .set({ Authorization: token });
  };

  const get = (url = '/api/preservations', token = 'my_private_token') =>
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
        screenshot: `/preservations/${preservation._id}/screenshot.jpg`,
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

    it('should respond 401 when not authorized', async () => {
      await get('/api/preservations', null).expect(401);
      await get('/api/preservations', 'invalid_token').expect(401);
    });

    it('should respond 404 when requesting an existing job with an invalid token', async () => {
      const { body: newPreservation } = await post().expect(202);
      await get(newPreservation.links.self, 'another_token').expect(404);
    });

    it('should respond 404 when job not found', async () => {
      await get('/api/preservations/non_existent').expect(404);
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
      await waitForExpect(async () => {
        const { body } = await get(newPreservation.links.self).expect(200);

        expect(body).toMatchObject({
          data: {
            id: newPreservation.id,
            attributes: {
              ...newPreservation.data.attributes,
              status: 'PROCESSED',
              downloads: {
                screenshot: `/preservations/${newPreservation.id}/screenshot.jpg`,
                video: `/preservations/${newPreservation.id}/video.mp4`,
              },
            },
          },
        });
      });
      await stopJobs();
    });

    it('should be able to download files on the processed job', async () => {
      const { body: newPreservation } = await post().expect(202);

      startJobs(job, 0);
      await waitForExpect(async () => {
        const { body } = await get(newPreservation.links.self).expect(200);

        const screenshot = await get(body.data.attributes.downloads.screenshot).expect(200);
        expect(screenshot.body.toString()).toBe('screenshot');
        const video = await get(body.data.attributes.downloads.video).expect(200);
        expect(video.body.toString()).toBe('video');
      });
      await stopJobs();
    });
  });
});
