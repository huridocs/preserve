import request from "supertest";

describe('Preserve API', () => {
  beforeAll(async () => {});

  describe('/health', () => {
    it('should respond with a 200', async () => {
      await request('localhost:4000').get('/api/health').expect(200);
    });
  });

  describe('POST /preservations', () => {
    it('should respond with 202, and return job information', async () => {
      const { body: newPreservation } = await request('localhost:4000').post('/api/preservations').expect(202);
      const { body: preservation } = await request('localhost:4000').get(newPreservation.url).expect(200);

      expect(preservation).toMatchObject({
        ...newPreservation,
        status: 'SCHEDULED'
      });
    });
  });
});

