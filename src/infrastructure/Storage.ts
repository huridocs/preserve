import { access, appendFile, mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export interface Storage {
  exists(path: string): Promise<boolean>;
  write(path: string, data: Buffer | string): Promise<void>;
  read(path: string): Promise<Buffer>;
  append(path: string, data: string | Uint8Array): Promise<void>;
  createDirectory(path: string): Promise<void>;
  getPath(...paths: string[]): string;
}

export class FileSystemStorage implements Storage {
  constructor(private basePath: string = '') {}

  async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  async write(path: string, data: Buffer | string): Promise<void> {
    await writeFile(path, data);
  }

  async read(path: string): Promise<Buffer> {
    return readFile(path);
  }

  async append(path: string, data: string | Uint8Array): Promise<void> {
    await appendFile(path, data);
  }

  async createDirectory(path: string): Promise<void> {
    await mkdir(path);
  }

  getPath(...paths: string[]): string {
    return path.join(this.basePath, ...paths);
  }
} 