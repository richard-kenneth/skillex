import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * True for endpoints that point back at the local machine, where virtual-hosted
 * bucket subdomains are not resolvable.
 */
export function isLoopbackEndpoint(endpoint: string): boolean {
  try {
    const { hostname } = new URL(endpoint);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.localhost')
    );
  } catch {
    return false;
  }
}

/**
 * Cloudflare R2 (or any S3-compatible store).
 *
 * Storage is optional. When credentials are incomplete the service logs that
 * it is disabled and every operation fails with a clear 503 instead of
 * constructing an S3 client with empty credentials.
 */
@Injectable()
export class R2Service {
  private readonly s3Client: S3Client | null;
  private readonly bucketName: string;
  private readonly logger = new Logger(R2Service.name);
  readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    const accessKeyId =
      this.configService.get<string>('R2_ACCESS_KEY_ID') || '';
    const secretAccessKey =
      this.configService.get<string>('R2_SECRET_ACCESS_KEY') || '';
    const endpoint = this.configService.get<string>('R2_ENDPOINT') || '';
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || '';

    this.enabled = Boolean(
      accessKeyId && secretAccessKey && endpoint && this.bucketName,
    );

    if (!this.enabled) {
      this.s3Client = null;
      this.logger.log(
        'File storage disabled: set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, and R2_BUCKET_NAME to enable.',
      );
      return;
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint,
      // Local S3-compatible services (SeaweedFS, MinIO) are reached at
      // http://localhost:<port>/<bucket>/<key>. Virtual-hosted URLs such as
      // <bucket>.localhost do not resolve on most machines, so use path-style
      // addressing for loopback endpoints. Cloudflare R2 keeps its default.
      forcePathStyle: isLoopbackEndpoint(endpoint),
      // The SDK adds a checksum of the (empty) command body to presigned PUT
      // URLs by default. The client then uploads different bytes, and strict
      // S3 implementations reject the request with BadDigest. Checksums are
      // not required for these uploads, so let the caller opt in explicitly.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId,
        secretAccessKey,
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
      return await getSignedUrl(this.requireClient(), command, { expiresIn });
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
      return await getSignedUrl(this.requireClient(), command, { expiresIn });
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
      await this.requireClient().send(command);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key} from R2:`, error);
      throw error;
    }
  }

  getPublicUrl(key: string): string {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        'File storage is not configured on this server.',
      );
    }

    const publicBaseUrl = this.configService.get<string>('R2_PUBLIC_URL');
    if (!publicBaseUrl) {
      return `${this.configService.get('R2_ENDPOINT')}/${this.bucketName}/${key}`;
    }
    return `${publicBaseUrl}/${key}`;
  }

  private requireClient(): S3Client {
    if (!this.s3Client) {
      throw new ServiceUnavailableException(
        'File storage is not configured on this server.',
      );
    }

    return this.s3Client;
  }
}
