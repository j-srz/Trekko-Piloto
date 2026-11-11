import { appConfig } from './app.config.js';
import { databaseConfig } from './database.config.js';
import { securityConfig } from './security.config.js';
import { storageConfig } from './storage.config.js';

describe('configuration factories', () => {
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it('normalizes app URLs, port, and comma-separated CORS origins', () => {
    process.env.PORT = '3100';
    process.env.CORS_ORIGINS = 'https://app.example, https://admin.example';

    expect(appConfig()).toMatchObject({
      port: 3100,
      corsOrigins: ['https://app.example', 'https://admin.example'],
    });
  });

  it('always disables TypeORM synchronize and runs versioned migrations', () => {
    expect(databaseConfig()).toMatchObject({
      synchronize: false,
      migrationsRun: true,
      type: 'postgres',
    });
  });

  it('decodes the validated data key and reads storage credentials', () => {
    process.env.DATA_ENCRYPTION_KEY =
      'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
    process.env.STORAGE_ENDPOINT = 'http://localhost:9000';
    process.env.STORAGE_BUCKET = 'trekko';
    process.env.STORAGE_ACCESS_KEY = 'minio';
    process.env.STORAGE_SECRET_KEY = 'minio-secret';
    process.env.STORAGE_PRIVATE_BUCKET = 'trekko-private';

    expect(securityConfig().dataEncryptionKey).toHaveLength(32);
    expect(storageConfig()).toMatchObject({
      endpoint: 'http://localhost:9000',
      bucket: 'trekko',
      privateBucket: 'trekko-private',
    });
  });
});
