// import { spawn } from 'child_process';
import { config } from './config';
import { connectDB } from './DB';

import { setupApp, startJobs } from './setupApp';
import { sugarcubeJob } from './sugarcubeJob';

connectDB(config.mongodb_uri).then(db => {
  const app = setupApp(db);
  app.listen(config.PORT, () => {
    console.log(`Example app listening on port ${config.PORT}`);
  });

  startJobs(sugarcubeJob, 1000);
});
