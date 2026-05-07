import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';

export interface IStorageService {
  saveFile(fileBuffer: Buffer, folder: string, filename: string): Promise<string>;
  deleteFile(filePath: string): Promise<void>;
}

// 1. Local Disk Storage Service (Volume-shared with Nginx)
export class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = config.uploadDir;
    // Ensure base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveFile(fileBuffer: Buffer, folder: string, filename: string): Promise<string> {
    const targetFolder = path.join(this.baseDir, folder);
    
    // Ensure nested folder exists (e.g. posters/, thumbnails/)
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const targetFilePath = path.join(targetFolder, filename);
    await fs.promises.writeFile(targetFilePath, fileBuffer);

    // Return the relative URL path served by Nginx (e.g. /static/uploads/posters/name.jpg)
    return `/static/uploads/${folder}/${filename}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    // Extract relative path from URL (e.g. /static/uploads/posters/name.jpg -> posters/name.jpg)
    if (fileUrl.startsWith('/static/uploads/')) {
      const relativePath = fileUrl.replace('/static/uploads/', '');
      const absolutePath = path.join(this.baseDir, relativePath);
      
      if (fs.existsSync(absolutePath)) {
        await fs.promises.unlink(absolutePath);
      }
    }
  }
}

// 2. AWS S3 Storage Service Placeholder (For Enterprise Scaling)
export class S3StorageService implements IStorageService {
  constructor() {
    // S3 configuration variables initialization would go here in production
  }

  async saveFile(_fileBuffer: Buffer, _folder: string, _filename: string): Promise<string> {
    throw new Error('S3 Storage Service is not yet implemented. Please set STORAGE_PROVIDER="LOCAL" inside environments.');
  }

  async deleteFile(_fileUrl: string): Promise<void> {
    throw new Error('S3 Storage Service is not yet implemented.');
  }
}

// 3. Storage Service Factory
export class StorageServiceFactory {
  static getProvider(): IStorageService {
    if (config.storageProvider.toUpperCase() === 'S3') {
      return new S3StorageService();
    }
    return new LocalStorageService();
  }
}

export const storageService = StorageServiceFactory.getProvider();
