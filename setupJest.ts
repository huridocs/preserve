import { mkdir, rm, rmdir } from 'fs/promises';
import path from 'path';
import { config } from 'src/config';

beforeAll(async () => {
  const testName = path.basename(expect.getState().testPath);
  config.data_path = `${__dirname}/specs/testing_files/downloads/${testName}-lastRun`;
  config.trusted_timestamps_path = `${__dirname}/specs/testing_files/trusted_timestamps/${testName}-lastRun`;
  await rm(config.data_path, { recursive: true, force: true });
  await rm(config.trusted_timestamps_path, { recursive: true, force: true });
  await mkdir(config.data_path);
  await mkdir(config.trusted_timestamps_path);
});

afterAll(async () => {
  try {
    await rmdir(config.data_path);
  } catch (e) {}
  try {
    await rmdir(config.trusted_timestamps_path);
  } catch (e) {}
});
