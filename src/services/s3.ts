import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: config.AWS_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    });
    this.bucketName = config.AWS_S3_BUCKET;
  }

  /**
   * Upload file to S3
   */
  async uploadFile(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Promise<{
    key: string;
    url: string;
    filename: string;
  }> {
    try {
      const fileExtension = file.originalname.split('.').pop();
      const filename = `${uuidv4()}.${fileExtension}`;
      const key = `uploads/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${filename}`;

      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentDisposition: `attachment; filename="${file.originalname}"`,
      });

      await this.s3Client.send(uploadCommand);

      const url = `https://${this.bucketName}.s3.${config.AWS_REGION}.amazonaws.com/${key}`;

      logger.info('File uploaded to S3', {
        key,
        filename,
        size: file.buffer.length,
      });

      return {
        key,
        url,
        filename,
      };
    } catch (error) {
      logger.error('S3 upload failed', { error, filename: file.originalname });
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Get signed URL for file download
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return signedUrl;
    } catch (error) {
      logger.error('Failed to generate signed URL', { error, key });
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Check if S3 is configured properly
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      // Try to list objects in the bucket (this will fail if bucket doesn't exist or credentials are wrong)
      await this.s3Client.send(new (require('@aws-sdk/client-s3').ListObjectsV2Command)({
        Bucket: this.bucketName,
        MaxKeys: 1,
      }));

      logger.info('S3 configuration validated successfully');
      return true;
    } catch (error) {
      logger.error('S3 configuration validation failed', { error });
      return false;
    }
  }
}
