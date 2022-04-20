import { spawn } from 'child_process';
import { appendFile, copyFile, mkdir, readFile } from 'fs/promises';
import { ObjectId } from 'mongodb';
import path from 'path';
import { config } from './config';
import { EvidenceDB } from './Api';
import { JobFunction, JobResults } from './QueueProcessor';

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
      '--media.youtubedl_force_download',
      '--tap.filename',
      `${__dirname}/../data/data-${id}.json`,
      '-Q',
      `youtube_video:${url}`,
      '--youtube.api_key',
      'AIzaSyCUqHumtR9-KJOhPNXxNJqWwW73bAslpv4',
    ]);

    ls.stdout.on('data', data => {
      console.log(data.toString());
      result += data.toString();
    });

    ls.stderr.on('data', (data: string) => {
      console.log(data.toString());
      result += data.toString();
    });

    ls.on('close', code => {
      if (code === 1) {
        reject(result);
      }
      // log all stdout and stderr to file/graylog ?
      // console.log(result);
      //
      readFile(`${__dirname}/../data/data-${id}.json`, 'utf-8')
        .then(fileText => {
          const theData = JSON.parse(fileText);
          const data = theData[1] ? { ...theData[0], ...theData[1] } : theData[0];
          resolve(data);
        })
        .catch(e => {
          console.log(e);
          reject(e);
        });
    });
  });
};
const sugarcubeJob: JobFunction = async (evidence: EvidenceDB) => {
  const sugarcubeResult = (await job(evidence.attributes.url, evidence._id)) as {
    body: string;
    _sc_downloads: Array<{ location: string; type: string }>;
  };

  const evidence_dir = path.join(config.data_path, evidence._id.toString());
  await mkdir(evidence_dir);

  const screenshot = sugarcubeResult._sc_downloads.find(d => d.location.match(/screenshot/));
  let screenshot_path: string | null = null;
  if (screenshot) {
    await copyFile(
      `${__dirname}/../${screenshot.location}`,
      path.join(evidence_dir, 'screenshot.jpg')
    );
    screenshot_path = path.join(evidence._id.toString(), 'screenshot.jpg');
  }

  const video = sugarcubeResult._sc_downloads.find(d => d.location.match(/\.mp4/));
  let video_path: string | null = null;

  if (video) {
    await copyFile(`${__dirname}/../${video.location}`, path.join(evidence_dir, 'video.mp4'));
    video_path = path.join(evidence._id.toString(), 'video.mp4');
  }

  await appendFile(path.join(evidence_dir, 'content.txt'), sugarcubeResult.body);
  const content_path = path.join(evidence._id.toString(), 'content.txt');

  const result: JobResults = {
    downloads: [
      { path: content_path, type: 'content' },
      ...(screenshot_path ? [{ path: screenshot_path, type: 'screenshot' }] : []),
      ...(video_path ? [{ path: video_path, type: 'video' }] : []),
    ],
  };

  return result;
};

export { sugarcubeJob };
