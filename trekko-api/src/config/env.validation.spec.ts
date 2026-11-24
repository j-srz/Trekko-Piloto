import { environmentSchema, validateEnvironment } from './env.validation.js';

const validEnvironment = {
  DATABASE_URL: 'postgres://trekko:trekko@localhost:5432/trekko',
  JWT_ACCESS_SECRET: 'test-secret-with-more-than-thirty-two-characters',
  DATA_ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
  STORAGE_ENDPOINT: 'http://localhost:9000',
  STORAGE_BUCKET: 'trekko',
  STORAGE_ACCESS_KEY: 'minio',
  STORAGE_SECRET_KEY: 'minio-secret',
  STORAGE_PRIVATE_BUCKET: 'trekko-private',
};

describe('environment configuration validation', () => {
  it('accepts a complete environment and applies defaults', () => {
    const result = environmentSchema.parse(validEnvironment);

    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.BCRYPT_COST).toBe(12);
  });

  it('rejects missing required settings and invalid encryption keys', () => {
    expect(
      environmentSchema.safeParse({
        ...validEnvironment,
        JWT_ACCESS_SECRET: undefined,
      }).success,
    ).toBe(false);
    expect(
      environmentSchema.safeParse({
        ...validEnvironment,
        DATA_ENCRYPTION_KEY: 'not-a-32-byte-key',
      }).success,
    ).toBe(false);
  });

  it('surfaces invalid settings at startup through the ConfigModule validator', () => {
    expect(() => validateEnvironment({})).toThrow(
      'Invalid environment configuration',
    );
    expect(
      () => validateEnvironment(validEnvironment).JWT_ACCESS_SECRET,
    ).not.toThrow();
  });
});
