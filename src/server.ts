import { spawn } from 'child_process';

import express from 'express';
import { Collection, Db, MongoClient, ObjectID } from 'mongodb';
import directory from 'serve-index';
import staticServer from 'serve-static';

const app = express();
const port = 4000;

app.use('/data', directory('./data'));
app.use('/data', staticServer('./data'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const DB_CONN_STRING='mongodb://localhost:29017'
const DB_NAME="huridocs-vault"
const COLLECTION_NAME="preservations"

let db: Db;
let preservations: Collection;

const connectDB = async () => {
  const client: MongoClient = new MongoClient(DB_CONN_STRING);
  await client.connect();
  db = client.db(DB_NAME);
  preservations = db.collection(COLLECTION_NAME);
}

connectDB()

app.post('/api/preservations', async (req, res) => {
  res.status(202);
  const id = new ObjectID();
  const result = { id, url: `/api/preservations/${id}` }
  await preservations.insertOne({ ...result, status: 'SCHEDULED' });
  res.json(result);
});

app.get('/api/preservations/:id', async (req, res) => {
  res.status(200);
  // console.log(await preservations.findOne({ _id: new ObjectID(req.params.id) }));
  const test = await preservations.findOne({ _id: req.params.id });
  // res.json(await preservations.findOne({ _id: req.params.id }))
  // res.json({
  //   id: 'new_preservation_id',
  //   url: '/api/preservations/new_preservation_id',
  //   status: 'SCHEDULED',
  // });
});

//const job = () => {
////
//// vagrant@bullseye:/opt/sugarcube$
//// /opt/sugarcube/node_modules/.bin/sugarcube
//// -p
//// http_import,youtube_video,workflow_merge,media_screenshot,media_youtubedl,mongodb_store
//// -Q http_url:'https://www.youtube.com/watch?v=E_8B_seg8AI'
//// -Q youtube_video:'https://www.youtube.com/watch?v=E_8B_seg8AI'
//// -Q workflow_merge:'{"_sc_id_hash" : "my_unique_id6"}'
//// --youtube.api_key AIzaSyCUqHumtR9-KJOhPNXxNJqWwW73bAslpv4
////

//  let result;
//  let error;
//  const ls = spawn('./node_modules/.bin/sugarcube', [
//    '-p', 'http_import,youtube_video,workflow_merge,media_screenshot,media_youtubedl,tap_printf',
//    '-Q', 'http_url:https://www.youtube.com/watch?v=E_8B_seg8AI',
//    '-Q', 'youtube_video:https://www.youtube.com/watch?v=E_8B_seg8AI',
//    // `-Q workflow_merge:'{"_sc_id_hash" : 'token-${Date.now()}'}'`,
//    '--youtube.api_key', 'AIzaSyCUqHumtR9-KJOhPNXxNJqWwW73bAslpv4'
//  ]);

//  ls.stdout.on('data', (data) => {
//    result += data.toString();
//  });

//  ls.stderr.on('data', (data: string) => {
//    console.log(data.toString());
//    // res.status(500).send({success: false, error: {message:data}});
//  });

//  ls.on('close', (code) => {
//    if (code === 1) {
//      res.send(`ERROR!!<br/><pre>${result}</pre>`)
//    }
//    res.send(`<pre>${result}</pre>`);
//  });
//}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
