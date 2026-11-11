import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service.js';

describe('StorageService', () => {
  let client: S3Client;
  let service: StorageService;

  beforeEach(() => {
    client = new S3Client({ region: 'us-east-1' });
    const config = new ConfigService({ storage: { bucket: 'trekko' } });
    service = new StorageService(client, config);
  });

  afterEach(() => {
    client.destroy();
  });

  it('probes the configured bucket', async () => {
    const send = jest.spyOn(client, 'send').mockResolvedValue({} as never);

    await expect(service.checkHealth()).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ input: { Bucket: 'trekko' } }),
    );
  });

  it('surfaces storage failures to the readiness check', async () => {
    jest
      .spyOn(client, 'send')
      .mockImplementation(() =>
        Promise.reject(new Error('bucket unavailable')),
      );

    await expect(service.checkHealth()).rejects.toThrow('bucket unavailable');
  });
});
