import path from 'path';
import { EvidenceDB, VideoDownloader, VideoDownloaderFlags } from 'src/types';
import { Logger } from 'winston';
import { create as createYoutubeDl } from 'youtube-dl-exec';
import { config } from '../config';

export class YoutubeDLVideoDownloader implements VideoDownloader {
  private readonly downloader;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.downloader = createYoutubeDl(config.video_downloader_path);
  }

  async download(evidence: EvidenceDB, flags: VideoDownloaderFlags): Promise<string> {
    let videoPath = '';
    try {
      await this.downloader(evidence.attributes.url, flags);
      videoPath = path.join(evidence._id.toString(), 'video.mp4');
    } catch (error: unknown) {
      if (!(error instanceof Error)) {
        throw error;
      }
      this.logger.error(error.message, { stacktrace: error.stack });
    }

    return videoPath;
  }
}
