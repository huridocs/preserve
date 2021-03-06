import * as Sentry from '@sentry/node';
import { create as createYoutubeDl } from 'youtube-dl-exec';
import { Evidence } from '../actions/PreserveEvidence';
import { config } from '../config';
import { EvidenceDB, VideoDownloader, VideoDownloaderFlags } from '../types';

export class VideoDownloaderError extends Error {
  public originalError: unknown;
  constructor(message: string, originalError: unknown) {
    super(message);
    this.originalError = originalError;
    this.name = 'VideoDownloaderError';
  }
}

export class YoutubeDLVideoDownloader implements VideoDownloader {
  private readonly downloader;

  constructor() {
    this.downloader = createYoutubeDl(config.video_downloader_path);
  }

  async download(_evidence: EvidenceDB, flags: VideoDownloaderFlags) {
    const evidence = new Evidence(_evidence);
    try {
      await this.downloader(evidence.url(), flags);
    } catch (error: unknown) {
      Sentry.captureException(error, { level: 'info' });
      return [];
    }

    return evidence.videoPaths();
  }
}
