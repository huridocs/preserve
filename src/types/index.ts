import { Request } from 'express';
import { ObjectId } from 'mongodb';
import { YtFlags } from 'youtube-dl-exec';

export type Cookie = {
  name: string;
  value: string;
  domain?: string;
  expirationDate?: number;
  hostOnly?: boolean;
  httpOnly?: boolean;
  path?: string;
  sameSite?: 'Strict' | 'Lax' | 'None';
  secure?: boolean;
  session?: boolean;
  storeId?: string;
};

export type status = 'SCHEDULED' | 'PROCESSING' | 'PROCESSED' | 'ERROR';

export type EvidenceBase = {
  tsa_files?: {
    allChecksumsRelativePath: string;
    tsRequestRelativePath: string;
    tsResponseRelativePath: string;
  };
  attributes: {
    date?: Date;
    status: status;
    url: string;
    downloads: { path: string; type: string; sha512checksum: string }[];
  };
};

export type EvidenceDB = EvidenceBase & {
  _id: ObjectId;
  user: ObjectId;
  cookies: Cookie[];
  cookiesFile: string;
  error?: string;
};

export type TokenDB = {
  _id: ObjectId;
  token: string;
};

export type PreservationOptions = {
  stepTimeout: number;
};

export type PreservationResults = {
  title: string;
  downloads: { path: string; type: string }[];
};

export type EvidenceResponse = EvidenceBase & { id: string; links: { self: string } };

export interface ApiRequestFilter extends Request {
  query: {
    filter?: {
      date: { gt: string };
      status: status;
    };
    page?: {
      limit: string;
    };
  };
}

export type User = {
  _id: ObjectId;
  token: string;
};

export interface FetchClient {
  fetch: (url: string, options?: object) => Promise<Response>;
}
export type VideoDownloaderFlags = YtFlags;

export interface VideoDownloader {
  download: (
    evidence: EvidenceDB,
    flags: VideoDownloaderFlags
  ) => Promise<[] | { path: string; type: string }[]>;
}

export enum Preservation {
  PDF = 'pdf',
  HTML = 'html',
  TXT = 'txt',
  FULL_SCREENSHOT = 'fullScreenshot',
  SCREENSHOT = 'screenshot',
  VIDEO = 'video',
}
