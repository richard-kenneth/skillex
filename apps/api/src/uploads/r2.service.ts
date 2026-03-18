import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class R2Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(R2Service.name);

  constructor(
    // @InjectPinoLogger(R2Service.name)
    // private readonly logger: PinoLogger,
    private configService: ConfigService,
  ) {
    const accessKeyId =
      this.configService.get<string>('R2_ACCESS_KEY_ID') || '';
    const secretAccessKey =
      this.configService.get<string>('R2_SECRET_ACCESS_KEY') || '';
    const endpoint = this.configService.get<string>('R2_ENDPOINT') || '';
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || '';

    if (!accessKeyId || !secretAccessKey || !endpoint || !this.bucketName) {
      this.logger.warn(
        'Cloudflare R2 configuration is incomplete. Uploads may fail.',
      );
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    try {
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned upload URL for ${key}:`,
        error,
      );
      throw error;
    }
  }

  async getPresignedDownloadUrl(
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned download URL for ${key}:`,
        error,
      );
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key} from R2:`, error);
      throw error;
    }
  }

  getPublicUrl(key: string): string {
    const publicBaseUrl = this.configService.get<string>('R2_PUBLIC_URL');
    if (!publicBaseUrl) {
      return `${this.configService.get('R2_ENDPOINT')}/${this.bucketName}/${key}`;
    }
    return `${publicBaseUrl}/${key}`;
  }
}
