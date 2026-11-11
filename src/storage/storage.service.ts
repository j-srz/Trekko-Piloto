import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private readonly bucket: string;

  constructor(
    private readonly client: S3Client,
    config: ConfigService,
  ) {
    this.bucket = config.getOrThrow<string>('storage.bucket');
  }

  async checkHealth(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }
}
