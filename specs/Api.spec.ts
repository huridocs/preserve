import { Application } from 'express';
import { appendFile, mkdir } from 'fs/promises';
import { Db, ObjectId } from 'mongodb';
import { Api, Evidence, EvidenceDB } from 'src/Api';
import { config } from 'src/config';
import { connectDB, disconnectDB } from 'src/DB';
import { Vault } from 'src/Vault';
import { JobFunction, JobResults, startJobs, stopJobs } from 'src/QueueProcessor';
import request from 'supertest';
import waitForExpect from 'wait-for-expect';

const DB_CONN_STRING = 'mongodb://localhost:27019';
const timeout = (miliseconds: number) => new Promise(resolve => setTimeout(resolve, miliseconds));

describe('Preserve API', () => {
  let app: Application;

  const post = (
    data: { url?: any; type?: 'evidences' } = { url: 'test-url' },
    token = 'my_private_token'
  ) => {
    // data.type = data.type || 'evidences';
    return request(app).post('/api/evidences').send(data).set({ Authorization: token });
  };

  const get = (url = '/api/evidences', token: string | null = 'my_private_token') =>
    request(app).get(url).set({ Authorization: token });

  let db: Db;
  const user1Id = new ObjectId();

  const job: JobFunction = async (evidence: EvidenceDB) => {
    await timeout(100);
    await mkdir(`${config.data_path}/${evidence._id}`);
    await appendFile(`${config.data_path}/${evidence._id}/screenshot.jpg`, 'screenshot');
    await appendFile(`${config.data_path}/${evidence._id}/video.mp4`, 'video');
    await appendFile(`${config.data_path}/${evidence._id}/content.txt`, 'content');
    const result: JobResults = {
      downloads: [
        { path: `${evidence._id}/content.txt`, type: 'content' },
        { path: `${evidence._id}/screenshot.jpg`, type: 'screenshot' },
        { path: `${evidence._id}/video.mp4`, type: 'video' },
      ],
    };
    return result;
  };

  beforeAll(async () => {
    config.data_path = `${__dirname}/../data`;
    db = await connectDB(DB_CONN_STRING, 'preserve-testing');
    app = Api(new Vault(db));
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('/api/health', () => {
    it('should respond with a 200', async () => {
      await request(app).get('/api/health').expect(200);
    });
  });

  describe('/api/evidences', () => {
    beforeEach(async () => {
      await db.collection('evidences').deleteMany({});
      await db.collection('users').deleteMany({});
      await db.collection('users').insertOne({ _id: user1Id, token: 'my_private_token' });
      await db.collection('users').insertOne({ token: 'another_token' });
    });

    it('should respond 404 when job not found', async () => {
      await get('/api/evidences/non_existent').expect(404);
    });

    it('should respond with 202, and return job information', async () => {
      const { body: newEvidence } = await post({ url: 'http://my-url' }).expect(202);
      const { body: evidence } = await get(newEvidence.data.links.self).expect(200);

      expect(evidence.data._id).not.toBeDefined();
      expect(newEvidence.data._id).not.toBeDefined();
      expect(evidence).toMatchObject({
        data: {
          attributes: {
            ...newEvidence.data.attributes,
            url: 'http://my-url',
            status: 'SCHEDULED',
          },
        },
      });
    });

    it('should set the job to PROCESSING', async () => {
      const { body: newEvidence } = await post().expect(202);

      startJobs(job, new Vault(db), 0);
      await waitForExpect(async () => {
        const { body } = await get(newEvidence.data.links.self).expect(200);

        expect(body).toMatchObject({
          data: {
            id: newEvidence.data.id,
            attributes: {
              ...newEvidence.data.attributes,
              status: 'PROCESSING',
            },
          },
        });
      });
      await stopJobs();
    });

    it('should process the job', async () => {
      const { body: newEvidence } = await post().expect(202);

      startJobs(job, new Vault(db), 0);
      await stopJobs();

      const { body } = await get(newEvidence.data.links.self).expect(200);
      expect(body).toMatchObject({
        data: {
          id: newEvidence.data.id,
          attributes: {
            ...newEvidence.data.attributes,
            status: 'PROCESSED',
            downloads: [
              { path: `/evidences/${newEvidence.data.id}/content.txt`, type: 'content' },
              {
                path: `/evidences/${newEvidence.data.id}/screenshot.jpg`,
                type: 'screenshot',
              },
              { path: `/evidences/${newEvidence.data.id}/video.mp4`, type: 'video' },
            ],
          },
        },
      });
    });

    it('should be able to download files on the processed job', async () => {
      const { body: newEvidence } = await post().expect(202);

      startJobs(job, new Vault(db), 0);
      await stopJobs();
      const { body } = await get(newEvidence.data.links.self).expect(200);

      const data: Evidence | null = body.data;

      const content = await get(
        data?.attributes?.downloads.find(d => d.type === 'content')?.path
      ).expect(200);
      expect(content.text).toBe('content');
      const screenshot = await get(
        data?.attributes.downloads.find((d: any) => d.type === 'screenshot')?.path
      ).expect(200);
      expect(screenshot.body.toString()).toBe('screenshot');
      const video = await get(
        data?.attributes.downloads.find((d: any) => d.type === 'video')?.path
      ).expect(200);
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
        await get('/api/evidences', null).expect(401);
        await get('/api/evidences', 'invalid_token').expect(401);
      });

      it('should respond 404 when requesting an existing job with an invalid token', async () => {
        const { body: newEvidence } = await post().expect(202);
        await get(newEvidence.data.links.self, 'another_token').expect(404);
      });

      it('should respond 404 when trying to download files belonging to another token', async () => {
        const { body: newEvidence } = await post().expect(202);

        startJobs(job, new Vault(db), 0);
        await stopJobs();

        const { body } = await get(newEvidence.data.links.self).expect(200);
        await get(body.data.attributes.downloads[0].path, 'another_token').expect(404);
        await get(body.data.attributes.downloads[1].path, 'another_token').expect(404);
      });

      it('should respond only jobs authorized for the token sent', async () => {
        const { body: newEvidence } = await post({ url: 'http://my-url' }).expect(202);
        await post({ url: 'http://another-url' }, 'another_token').expect(202);

        const { body: evidence } = await get().expect(200);

        expect(evidence).toMatchObject({
          data: [
            {
              id: newEvidence.data.id,
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
