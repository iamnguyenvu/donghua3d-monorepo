import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface IStorageService {
  saveFile(fileBuffer: Buffer, folder: string, filename: string): Promise<string>;
  deleteFile(filePath: string): Promise<void>;
  generatePresignedUrl(key: string, expiresIn?: number): Promise<string>;
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

  async generatePresignedUrl(key: string, _expiresIn?: number): Promise<string> {
    return key;
  }
}

// 2. AWS S3 / Cloudflare R2 Storage Service
export class S3StorageService implements IStorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = config.s3.bucketName;
    
    // Check if endpoint is specified. Since R2 requires custom endpoints, we configure accordingly.
    const s3Config: any = {
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
      region: 'auto', // R2 auto region
    };

    if (config.s3.endpoint) {
      s3Config.endpoint = config.s3.endpoint;
    }

    this.s3Client = new S3Client(s3Config);
  }

  async saveFile(fileBuffer: Buffer, folder: string, filename: string): Promise<string> {
    const key = `${folder}/${filename}`;
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
      })
    );
    return key;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const key = fileUrl.replace(/^s3:\/\/[^\/]+\//, '').replace(/^\/?s3\//, '');
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
  }

  async generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!key) return '';
    
    // If it's already an absolute URL (mock stream), return as is
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    
    return getSignedUrl(this.s3Client, command, { expiresIn });
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
