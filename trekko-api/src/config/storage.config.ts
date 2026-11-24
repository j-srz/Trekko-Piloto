import { registerAs } from '@nestjs/config';

export const storageConfig = registerAs('storage', () => ({
  endpoint: process.env.STORAGE_ENDPOINT!,
  bucket: process.env.STORAGE_BUCKET!,
  accessKey: process.env.STORAGE_ACCESS_KEY!,
  secretKey: process.env.STORAGE_SECRET_KEY!,
  privateBucket: process.env.STORAGE_PRIVATE_BUCKET!,
}));
