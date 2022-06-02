import path from 'path';
import { EvidenceDB, VideoDownloader, VideoDownloaderFlags } from 'src/types';
import { create as createYoutubeDl } from 'youtube-dl-exec';
import { config } from '../config';

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

  async download(evidence: EvidenceDB, flags: VideoDownloaderFlags): Promise<string> {
    let videoPath = '';
    try {
      await this.downloader(evidence.attributes.url, flags);
      videoPath = path.join(evidence._id.toString(), 'video.mp4');
    } catch (error: unknown) {
      const { message, stderr } = error as { message: string; stderr?: string };

      if (stderr?.includes('Unsupported URL')) {
        return '';
      }

      if (message) {
        throw new VideoDownloaderError(message, error);
      }

      throw error;
    }

    return videoPath;
  }
}
