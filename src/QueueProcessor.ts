import { ObjectId } from 'mongodb';
import { Logger } from 'winston';
import { Vault } from './Vault';
import { logger } from './logger';
import { ProcessJob } from './actions/ProcessJob';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { config } from './config';

export type status = 'SCHEDULED' | 'PROCESSING' | 'PROCESSED' | 'ERROR';

export type EvidenceBase = {
  tsa_files?: {
    aggregateChecksum: string;
    timeStampRequest: string;
    timeStampResponse: string;
  };
  attributes: {
    date?: Date;
    status: status;
    url: string;
    downloads: { path: string; type: string; sha512checksum: string }[];
  };
};

export type EvidenceDB = EvidenceBase & { _id: ObjectId; user: ObjectId; error?: string };

export type JobResults = {
  title: string;
  downloads: { path: string; type: string }[];
};

export type JobFunction = (evidence: EvidenceDB) => Promise<JobResults>;

const timeout = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

const shell = (command: string) => {
  return new Promise((resolve, reject) => {
    const child = exec(command);
    child.addListener('error', reject);
    child.addListener('exit', resolve);
  });
};

const tsa = async (evidenceId: ObjectId, downloads: EvidenceBase['attributes']['downloads']) => {
  const aggregateChecksumPath = `/${evidenceId}/aggregateChecksum.txt`;
  await writeFile(
    path.join(config.data_path, aggregateChecksumPath),
    downloads.map(download => `${download.sha512checksum}\n`)
  );

  const timeStampRequestPath = `/${evidenceId}/tsaRequest.tsq`;
  // await writeFile(path.join(config.data_path, timeStampRequestPath), 'request not implemented');

  await shell(
    `openssl ts -query -data ${path.join(
      config.data_path,
      aggregateChecksumPath
    )} -no_nonce -sha512 -cert -out ${path.join(config.data_path, timeStampRequestPath)}`
  );

  const timeStampResponsePath = `/${evidenceId}/tsaResponse.tsr`;

  const response = await fetch('https://freetsa.org/tsr', {
    method: 'POST',
    body: await readFile(path.join(config.data_path, timeStampRequestPath)),
    headers: {
      'Content-Type': 'application/timestamp-query',
    },
  });

  await writeFile(
    path.join(config.data_path, timeStampResponsePath),
    Buffer.from(await response.arrayBuffer())
  );

  return {
    aggregateChecksum: `/evidences${aggregateChecksumPath}`,
    timeStampRequest: `/evidences${timeStampRequestPath}`,
    timeStampResponse: `/evidences${timeStampResponsePath}`,
  };
};

let resolvePromise: undefined | ((value: unknown) => void);
const processJobs = async (job: JobFunction, vault: Vault, logger: Logger, interval = 1000) => {
  while (!resolvePromise) {
    await timeout(interval);
    const action = new ProcessJob(vault, logger);
    await action.execute(job);
  }
  resolvePromise(1);
};

const stopJobs = async () => {
  return new Promise(resolve => {
    resolvePromise = resolve;
  });
};

const startJobs = (job: JobFunction, vault: Vault, interval: number) => {
  resolvePromise = undefined;
  processJobs(job, vault, logger, interval);
};

export { startJobs, stopJobs };
