import { Application } from 'express';
import { appendFile, mkdir } from 'fs/promises';
import { Db, ObjectId } from 'mongodb';
import { Api } from 'src/Api';
import { config } from 'src/config';
import { connectDB, disconnectDB } from 'src/DB';
import { Vault } from 'src/Vault';
import { EvidenceDB, JobFunction, JobResults, QueueProcessor } from 'src/QueueProcessor';
import request from 'supertest';
import waitForExpect from 'wait-for-expect';
import { EvidenceResponse } from 'src/Response';
import { FakeVault } from './FakeVault';
import { fakeLogger } from './fakeLogger';
import { checksumFile } from '../src/checksumFile';
import { ProcessJob } from 'src/actions/ProcessJob';
import { TSAService } from 'src/TSAService';
import { Cookie } from '../src/types/index';

const timeout = (miliseconds: number) => new Promise(resolve => setTimeout(resolve, miliseconds));

describe('Preserve API', () => {
  let app: Application;
  let queue: QueueProcessor;

  const post = (
    data: { url?: unknown; type?: 'evidences'; cookies?: Cookie[] } = {
      url: 'test-url',
      cookies: [],
    },
    token = 'my_private_token'
  ) => {
    return request(app).post('/api/evidences').send(data).set({ Authorization: token });
  };

  const get = (url = '/api/evidences', token: string | null = 'my_private_token') =>
    request(app).get(url).set({ Authorization: token });

  let db: Db;
  let vault: Vault;
  const user1Id = new ObjectId();

  const job: JobFunction = async (evidence: EvidenceDB) => {
    await timeout(100);
    await mkdir(`${config.data_path}/${evidence._id}`);
    await appendFile(`${config.data_path}/${evidence._id}/screenshot.jpg`, 'screenshot');
    await appendFile(`${config.data_path}/${evidence._id}/video.mp4`, 'video');
    await appendFile(`${config.data_path}/${evidence._id}/content.txt`, 'content');
    const result: JobResults = {
      title: 'title',
      downloads: [
        { path: `${evidence._id}/content.txt`, type: 'content' },
        { path: `${evidence._id}/screenshot.jpg`, type: 'screenshot' },
        { path: `${evidence._id}/video.mp4`, type: 'video' },
      ],
    };
    return result;
  };

  class FakeTSAService extends TSAService {
    async timestamp(_file: string, folder: string) {
      return {
        tsRequestRelativePath: `${folder}/timeStampRequest`,
        tsResponseRelativePath: `${folder}/timeStampResponse`,
      };
    }
  }

  beforeAll(async () => {
    config.data_path = `${__dirname}/downloads`;
    config.trusted_timestamps_path = `${__dirname}/trusted_timestamps`;
    db = await connectDB('preserve-api-testing');
    vault = new Vault(db);
    app = Api(vault, fakeLogger);
    const action = new ProcessJob(job, vault, fakeLogger, new FakeTSAService());
    queue = new QueueProcessor(action, 0);
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

    it('should not expose internal properties', async () => {
      const { body: newEvidence } = await post({
        url: 'http://my-url',
        cookies: [{ name: 'a_cookie', value: 'cookie_value' }],
      }).expect(202);
      const { body: evidence } = await get(newEvidence.data.links.self).expect(200);

      expect(evidence.data._id).not.toBeDefined();
      expect(newEvidence.data._id).not.toBeDefined();
      expect(newEvidence.data.user).not.toBeDefined();
      expect(newEvidence.data.cookies).not.toBeDefined();
    });

    it('should respond with 202, and return job information', async () => {
      const { body: newEvidence } = await post({ url: 'http://my-url', cookies: [] }).expect(202);
      const { body: evidence } = await get(newEvidence.data.links.self).expect(200);

      expect(evidence).toMatchObject({
        data: {
          attributes: {
            url: 'http://my-url',
            status: 'SCHEDULED',
          },
        },
      });
    });

    it('should set the job to PROCESSING', async () => {
      const { body: newEvidence } = await post().expect(202);

      queue.start();
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
      await queue.stop();
    });

    it('should timestamp the evidence using TSAService', async () => {
      const { body: newEvidence } = await post().expect(202);

      queue.start();
      await queue.stop();

      const processedInDb = await vault.getOne(new ObjectId(newEvidence.data.id), {
        _id: user1Id,
        token: 'my_private_token',
      });

      expect(processedInDb?.tsa_files).toMatchObject({
        allChecksumsRelativePath: `${newEvidence.data.id}/aggregateChecksum.txt`,
        tsRequestRelativePath: `${newEvidence.data.id}/timeStampRequest`,
        tsResponseRelativePath: `${newEvidence.data.id}/timeStampResponse`,
      });
    });

    it('should process the job', async () => {
      const { body: newEvidence } = await post().expect(202);

      queue.start();
      await queue.stop();

      const { body } = await get(newEvidence.data.links.self).expect(200);
      expect(body).toMatchObject({
        data: {
          id: newEvidence.data.id,
          attributes: {
            title: 'title',
            status: 'PROCESSED',
            downloads: [
              {
                path: `/evidences/${newEvidence.data.id}/content.txt`,
                sha512checksum: await checksumFile(
                  `${config.data_path}/${newEvidence.data.id}/content.txt`
                ),
                type: 'content',
              },
              {
                path: `/evidences/${newEvidence.data.id}/screenshot.jpg`,
                sha512checksum: await checksumFile(
                  `${config.data_path}/${newEvidence.data.id}/screenshot.jpg`
                ),
                type: 'screenshot',
              },
              {
                path: `/evidences/${newEvidence.data.id}/video.mp4`,
                sha512checksum: await checksumFile(
                  `${config.data_path}/${newEvidence.data.id}/video.mp4`
                ),
                type: 'video',
              },
            ],
          },
        },
      });
    });

    it('should be able to download files on the processed job', async () => {
      const { body: newEvidence } = await post().expect(202);

      queue.start();
      await queue.stop();
      const { body } = await get(newEvidence.data.links.self).expect(200);

      const data: EvidenceResponse | null = body.data;

      const content = await get(
        data?.attributes?.downloads.find(d => d.type === 'content')?.path
      ).expect(200);
      expect(content.text).toBe('content');
      const screenshot = await get(
        data?.attributes.downloads.find(d => d.type === 'screenshot')?.path
      ).expect(200);
      expect(screenshot.body.toString()).toBe('screenshot');
      const video = await get(
        data?.attributes.downloads.find(d => d.type === 'video')?.path
      ).expect(200);
      expect(video.body.toString()).toBe('video');
    });

    describe('Validation', () => {
      describe('POST', () => {
        it('should respond 400 when no url passed', async () => {
          await post({}).expect(400);
          await post({ url: 4, cookies: [] }).expect(400);
        });
        it('should not add any job when validation fails', async () => {
          await post({}).expect(400);
          let { body } = await get().expect(200);
          expect(body).toMatchObject({ data: [] });

          await post({ url: 4, cookies: [] }).expect(400);
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

        queue.start();
        await queue.stop();

        const { body } = await get(newEvidence.data.links.self).expect(200);
        await get(body.data.attributes.downloads[0].path, 'another_token').expect(404);
        await get(body.data.attributes.downloads[1].path, 'another_token').expect(404);
      });

      it('should respond only jobs authorized for the token sent', async () => {
        const { body: newEvidence } = await post({ url: 'http://my-url', cookies: [] }).expect(202);
        await post({ url: 'http://another-url', cookies: [] }, 'another_token').expect(202);

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

    describe('Error handling', () => {
      beforeEach(() => {
        app = Api(new FakeVault(db), fakeLogger);
        app = Api(new FakeVault(db), fakeLogger);
      });
      describe('POST', () => {
        it('should respond 500 on errors', async () => {
          const { body } = await post().expect(500);
          expect(body).toEqual({ error: 'Something went wrong with evidence creation' });
        });
      });

      describe('GET', () => {
        it('should respond 500 on errors', async () => {
          const evidenceId = new ObjectId();

          await get()
            .expect({ error: 'Something went wrong with evidence retrieval by user' })
            .expect(500);

          await get(`/api/evidences/${evidenceId}`)
            .expect({ error: 'Something went wrong with evidence retrieval' })
            .expect(500);

          await get(`/evidences/${evidenceId}/screenshot.jpg`)
            .expect({ error: 'Something went wrong with evidence retrieval' })
            .expect(500);
        });
      });

      describe('Job', () => {
        it('should set the job to ERROR', async () => {
          const vault = new Vault(db);
          app = Api(vault, fakeLogger);
          const { body: newEvidence } = await post().expect(202);

          const fakeJob: JobFunction = async () => {
            throw new Error('Job error');
          };

          const action = new ProcessJob(fakeJob, vault, fakeLogger, new FakeTSAService());
          queue = new QueueProcessor(action, 0);
          queue.start();
          await waitForExpect(async () => {
            const { body } = await get(newEvidence.data.links.self).expect(200);
            expect(body).toMatchObject({
              data: {
                id: newEvidence.data.id,
                attributes: {
                  status: 'ERROR',
                },
              },
            });
          });
          await queue.stop();
          expect(
            await vault.getOne(new ObjectId(newEvidence.data.id), {
              _id: user1Id,
              token: 'my_private_token',
            })
          ).toMatchObject({
            error: 'Job error',
          });
        });
      });
    });
  });
});
