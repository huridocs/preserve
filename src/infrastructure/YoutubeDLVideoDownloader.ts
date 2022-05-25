import path from 'path';
import { VideoDownloader, VideoDownloaderFlags } from 'src/types';
import { create as createYoutubeDl } from 'youtube-dl-exec';
import { config } from '../config';

class YoutubeDLVideoDownloader implements VideoDownloader {
  download(url: string, path: string, flags: VideoDownloaderFlags): unknown {
    const youtubedl = createYoutubeDl(config.video_downloader_path);
    await youtubedl(evidence.attributes.url, {
      output: path.join(evidence_dir, 'video.mp4'),
      format: 'best',
    });
    video_path = path.join(evidence._id.toString(), 'video.mp4');
  }

}
