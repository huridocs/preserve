// import { spawn } from 'child_process';
import { connectDB } from './DB';

import { setupApp } from './setupApp';
// import directory from 'serve-index';
// import staticServer from 'serve-static';

const port = 4000;

// app.use('/data', directory('./data'));
// app.use('/data', staticServer('./data'));

const DB_CONN_STRING = 'mongodb://localhost:29017';

connectDB(DB_CONN_STRING).then(db => {
  const app = setupApp(db);
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
});

//const job = async () => {
//  //
//  // vagrant@bullseye:/opt/sugarcube$
//  // /opt/sugarcube/node_modules/.bin/sugarcube
//  // -p
//  // http_import,youtube_video,workflow_merge,media_screenshot,media_youtubedl,mongodb_store
//  // -Q http_url:'https://www.youtube.com/watch?v=E_8B_seg8AI'
//  // -Q youtube_video:'https://www.youtube.com/watch?v=E_8B_seg8AI'
//  // -Q workflow_merge:'{"_sc_id_hash" : "my_unique_id6"}'
//  // --youtube.api_key AIzaSyCUqHumtR9-KJOhPNXxNJqWwW73bAslpv4
//  //

//  return new Promise((resolve, reject) => {
//    let result;
//    let error;
//    const ls = spawn('./node_modules/.bin/sugarcube', [
//      '-p',
//      // 'http_import,youtube_video,workflow_merge,media_screenshot,media_youtubedl,tap_printf',
//      'http_import,tap_printf',
//      '-Q',
//      'http_url:https://www.youtube.com/watch?v=E_8B_seg8AI',
//      // '-Q',
//      // 'youtube_video:https://www.youtube.com/watch?v=E_8B_seg8AI',
//      // `-Q workflow_merge:'{"_sc_id_hash" : 'token-${Date.now()}'}'`,
//      '--youtube.api_key',
//      'AIzaSyCUqHumtR9-KJOhPNXxNJqWwW73bAslpv4',
//    ]);

//    ls.stdout.on('data', data => {
//      console.log(data.toString());
//      result += data.toString();
//    });

//    ls.stderr.on('data', (data: string) => {
//      console.log(data.toString());
//      // res.status(500).send({success: false, error: {message:data}});
//    });

//    ls.on('close', code => {
//      if (code === 1) {
//        reject(`ERROR!!<br/><pre>${result}</pre>`);
//      }
//      resolve(`<pre>${result}</pre>`);
//    });
//  });
//};
