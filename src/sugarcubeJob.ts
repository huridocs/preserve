import { spawn } from 'child_process';
import { copyFile, mkdir, readFile } from 'fs/promises';
import { ObjectId } from 'mongodb';
import path from 'path';
import { config } from './config';
import { JobFunction, PreservationDB } from './setupApp';

const job = async (url: string, id: ObjectId) => {
  return new Promise((resolve, reject) => {
    let result: string;
    // let error;
    const ls = spawn('./node_modules/.bin/sugarcube', [
      '-p',
      'http_import,youtube_video,media_screenshot,media_youtubedl,tap_writef',
      '-Q',
      `http_url:${url}`,
      '-M',
      `${id}`,
      '--media.force',
      '--tap.filename',
      `${__dirname}/../data/data-${id}.json`,
      '-Q',
      `youtube_video:${url}`,
      '--youtube.api_key',
      'AIzaSyCUqHumtR9-KJOhPNXxNJqWwW73bAslpv4',
    ]);

    ls.stdout.on('data', data => {
      result += data.toString();
    });

    ls.stderr.on('data', (data: string) => {
      result += data.toString();
    });

    ls.on('close', code => {
      if (code === 1) {
        reject(`ERROR!!<br/><pre>${result}</pre>`);
      }
      // log all stdout and stderr to file/graylog ?
      // console.log(result);
      //
      readFile(`${__dirname}/../data/data-${id}.json`, 'utf-8').then(data => {
        resolve(JSON.parse(data)[0]);
      });
    });
  });
};
const sugarcubeJob: JobFunction = async (preservation: PreservationDB) => {
  const result = (await job(preservation.attributes.url, preservation._id)) as {
    body: string;
    _sc_downloads: Array<{ location: string; type: string }>;
  };

  const preservation_dir = path.join(config.data_path, preservation._id.toString());
  await mkdir(preservation_dir);

  const screenshot = result._sc_downloads.find(d => d.location.match(/screenshot/));
  let screenshot_path: string | null = null;
  if (screenshot) {
    await copyFile(
      `${__dirname}/../${screenshot.location}`,
      path.join(preservation_dir, 'screenshot.jpg')
    );
    screenshot_path = path.join(preservation._id.toString(), 'screenshot.jpg');
  }

  const video = result._sc_downloads.find(d => d.location.match(/\.mp4/));
  let video_path: string | null = null;

  if (video) {
    await copyFile(`${__dirname}/../${video.location}`, path.join(preservation_dir, 'video.mp4'));
    video_path = path.join(preservation._id.toString(), 'video.mp4');
  }

  return {
    content: result.body,
    downloads: {
      ...(screenshot_path ? { screenshot: screenshot_path } : {}),
      ...(video_path ? { video: video_path } : {}),
    },
  };
};

export { sugarcubeJob };
