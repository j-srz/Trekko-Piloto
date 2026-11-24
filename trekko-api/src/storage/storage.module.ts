import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { createS3Client } from './s3-client.factory.js';
import { StorageService } from './storage.service.js';

@Module({
  providers: [
    {
      provide: S3Client,
      inject: [ConfigService],
      useFactory: createS3Client,
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
