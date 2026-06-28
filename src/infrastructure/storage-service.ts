import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export interface StorageService {
  saveFile(file: File, destinationFolder: string): Promise<{ url: string; nombreAlmacenado: string }>;
  deleteFile(url: string): Promise<void>;
}

export class LocalStorageService implements StorageService {
  async saveFile(file: File, destinationFolder: string) {
    const timestamp = Date.now();
    const nombreAlmacenado = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', destinationFolder);
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, nombreAlmacenado);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return {
      url: `/uploads/${destinationFolder}/${nombreAlmacenado}`,
      nombreAlmacenado
    };
  }

  async deleteFile(url: string) {
    const relativePath = url.replace(/^\//, '');
    const fullPath = path.join(process.cwd(), 'public', relativePath);
    try {
      await unlink(fullPath);
    } catch (e) {
      console.error(`Failed to delete local file ${fullPath}:`, e);
    }
  }
}

export class S3StorageService implements StorageService {
  private s3: S3Client;
  private bucketName = process.env.STORAGE_BUCKET_NAME || '';
  private endpoint = process.env.STORAGE_ENDPOINT || '';

  constructor() {
    this.s3 = new S3Client({
      endpoint: this.endpoint || undefined,
      region: process.env.STORAGE_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: !!this.endpoint,
    });
  }

  async saveFile(file: File, destinationFolder: string) {
    const timestamp = Date.now();
    const nombreAlmacenado = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const key = `${destinationFolder}/${nombreAlmacenado}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const fileUrl = this.endpoint
      ? `${this.endpoint}/${this.bucketName}/${key}`
      : `https://${this.bucketName}.s3.amazonaws.com/${key}`;

    return {
      url: fileUrl,
      nombreAlmacenado,
    };
  }

  async deleteFile(url: string) {
    try {
      let key = '';
      if (this.endpoint && url.includes(this.bucketName)) {
        const parts = url.split(`${this.bucketName}/`);
        if (parts.length > 1) key = parts[1];
      } else if (url.includes('.amazonaws.com/')) {
        const parts = url.split('.amazonaws.com/');
        if (parts.length > 1) key = parts[1];
      } else {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const prefix = `/${this.bucketName}/`;
        if (pathname.startsWith(prefix)) {
          key = pathname.substring(prefix.length);
        } else {
          key = pathname.substring(1);
        }
      }

      if (key) {
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          })
        );
      }
    } catch (e) {
      console.error(`Failed to delete S3 file ${url}:`, e);
    }
  }
}

export function getStorageService(): StorageService {
  const provider = process.env.STORAGE_PROVIDER || 'local';
  if (provider === 's3') {
    return new S3StorageService();
  }
  return new LocalStorageService();
}
