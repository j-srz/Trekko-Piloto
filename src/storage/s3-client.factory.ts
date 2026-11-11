import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

export function createS3Client(config: ConfigService): S3Client {
  return new S3Client({
    endpoint: config.getOrThrow<string>('storage.endpoint'),
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.getOrThrow<string>('storage.accessKey'),
      secretAccessKey: config.getOrThrow<string>('storage.secretKey'),
    },
  });
}
