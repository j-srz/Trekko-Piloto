import { registerAs } from '@nestjs/config';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  '../database/migrations/*{.js,.ts}',
);

export const databaseConfig = registerAs('database', () => ({
  type: 'postgres' as const,
  url: process.env.DATABASE_URL,
  synchronize: false,
  migrationsRun: true,
  migrationsTableName: 'migrations',
  migrations: [migrationsDirectory],
  logging:
    process.env.NODE_ENV === 'development'
      ? ['error', 'warn', 'schema', 'migration']
      : false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  extra: {
    application_name: 'trekko-api',
  },
}));
