import { ObjectId } from 'mongodb';
import { PreserveEvidence } from '../../src/actions/PreserveEvidence';
import { YoutubeDLVideoDownloader } from '../../src/infrastructure/YoutubeDLVideoDownloader';
import { EvidenceDB } from '../../src/types';
import { FakeHTTPClient } from '../FakeHTTPClient';
import { fakeLogger } from '../fakeLogger';

describe('PreserveEvidence', () => {
  it('should download videos using cookies', async () => {
    const videoDownloader = new YoutubeDLVideoDownloader(fakeLogger);
    const action = new PreserveEvidence(fakeLogger, new FakeHTTPClient(), videoDownloader);
    const evidence: EvidenceDB = {
      _id: new ObjectId(),
      user: new ObjectId(),
      cookies: [{ name: 'a_name', value: 'a_value', domain: 'localhost' }],
      attributes: {
        status: 'PROCESSING',
        url: 'http://localhost:5960/test_page',
        downloads: [],
      },
    };

    const spy = jest.spyOn(videoDownloader, 'download');
    await action.execute({ stepTimeout: 0 })(evidence);

    expect(spy).toHaveBeenCalledWith(evidence, {
      format: 'best',
      output: expect.any(String),
      cookies: 'a_name=a_value',
    });
  }, 10000);
});
