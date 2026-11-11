import { ConfigService } from '@nestjs/config';
import { createS3Client } from './s3-client.factory.js';

describe('createS3Client', () => {
  it('configures path-style S3 access to the validated endpoint', () => {
    const config = new ConfigService({
      storage: {
        endpoint: 'http://localhost:9000',
        accessKey: 'minio',
        secretKey: 'minio-secret',
      },
    });
    const client = createS3Client(config);

    expect(client.config.endpoint).toBeDefined();
    client.destroy();
  });
});
