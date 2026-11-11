import { AppDataSource } from '../src/database/data-source.js';
import { seedCatalog } from '../src/database/seeds/catalog.seed.js';
import { seedOriginalRoutes } from '../src/database/seeds/routes.seed.js';

try {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  await seedCatalog(AppDataSource);
  await seedOriginalRoutes(AppDataSource);
} catch (error) {
  process.stderr.write(
    `Catalog seed failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
  );
  process.exitCode = 1;
} finally {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}
