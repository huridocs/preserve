import { spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { JobFunction, PreservationDB } from './setupApp';

const job = async (url: string, id) => {
  return new Promise((resolve, reject) => {
    let result;
    let error;
    const ls = spawn('./node_modules/.bin/sugarcube', [
      '-p',
      // 'http_import,youtube_video,workflow_merge,media_screenshot,media_youtubedl,tap_printf',
      'http_import,media_screenshot,tap_writef',
      '-Q',
      `http_url:${url}`,
      // '-M',
      // `${id}`,
      '--media.force',
      '--tap.filename',
      `${__dirname}/../data/data-${id}.json`,
      // '-Q',
      // 'youtube_video:https://www.youtube.com/watch?v=E_8B_seg8AI',
      // `-Q workflow_merge:'{"_sc_id_hash" : 'token-${Date.now()}'}'`,
      // '--youtube.api_key',
      // 'AIzaSyCUqHumtR9-KJOhPNXxNJqWwW73bAslpv4',
    ]);

    ls.stdout.on('data', data => {
      result += data.toString();
    });

    ls.stderr.on('data', (data: string) => {
      result += data.toString();
      // res.status(500).send({success: false, error: {message:data}});
    });

    ls.on('close', code => {
      if (code === 1) {
        reject(`ERROR!!<br/><pre>${result}</pre>`);
      }
      // log all stdout and stderr to file/graylog ?
      console.log(result);
      //
      readFile(`${__dirname}/../data/data-${id}.json`, 'utf-8').then(data => {
        resolve(JSON.parse(data)[0]);
      });
    });
  });
};
const sugarcubeJob: JobFunction = async (preservation: PreservationDB) => {
  // await mkdir(`${__dirname}/data/${preservation._id}`);
  // await appendFile(`${__dirname}/data/${preservation._id}/screenshot.jpg`, 'screenshot');
  // await appendFile(`${__dirname}/data/${preservation._id}/video.mp4`, 'video');
  const result = (await job(preservation.attributes.url, preservation._id)) as {
    body: string;
    _sc_downloads: Array<{ location: string; type: string }>;
  };
  console.log(result);
  return {
    content: result.body,
    downloads: {
      screenshots: [],
      video: '',
    },
  };
};

export { sugarcubeJob };
