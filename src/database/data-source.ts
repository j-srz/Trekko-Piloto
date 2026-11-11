import 'dotenv/config';
import { DataSource } from 'typeorm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEnvironment } from '../config/env.validation.js';

const environment = validateEnvironment(process.env);
const migrationsDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  'migrations/*{.js,.ts}',
);

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: environment.DATABASE_URL,
  synchronize: false,
  logging:
    environment.NODE_ENV === 'development'
      ? ['error', 'warn', 'schema', 'migration']
      : false,
  entities: [],
  migrations: [migrationsDirectory],
  migrationsTableName: 'migrations',
});

export default AppDataSource;
