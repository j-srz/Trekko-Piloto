import { GenericContainer, Wait } from 'testcontainers';
import { DataSource } from 'typeorm';
import { Bootstrap1710000000000 } from '../../src/database/migrations/1710000000000-bootstrap.js';

describe('PostGIS bootstrap migration', () => {
  let container: Awaited<ReturnType<GenericContainer['start']>>;
  let dataSource: DataSource;

  beforeAll(async () => {
    container = await new GenericContainer('postgis/postgis:16-3.5')
      .withEnvironment({
        POSTGRES_USER: 'trekko',
        POSTGRES_PASSWORD: 'trekko',
        POSTGRES_DB: 'trekko',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(
        Wait.forLogMessage('database system is ready to accept connections', 2),
      )
      .start();

    dataSource = new DataSource({
      type: 'postgres',
      url: `postgres://trekko:trekko@${container.getHost()}:${container.getMappedPort(5432)}/trekko`,
      synchronize: false,
      entities: [],
      migrations: [Bootstrap1710000000000],
      migrationsTableName: 'migrations',
    });
    await dataSource.initialize();
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await dataSource.query('DROP EXTENSION IF EXISTS citext CASCADE');
    await dataSource.query('DROP EXTENSION IF EXISTS pg_trgm CASCADE');
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await container?.stop();
  });

  it('applies, reverts, and reapplies the migration and verifies its extensions', async () => {
    await dataSource.runMigrations();
    await expectExtensions(['citext', 'pg_trgm', 'postgis']);
    await expect(
      dataSource.query(
        "SELECT to_regclass('public.app_metadata') AS table_name",
      ),
    ).resolves.toEqual([{ table_name: 'app_metadata' }]);

    await dataSource.undoLastMigration();
    await expectExtensions(['postgis']);
    await expect(
      dataSource.query(
        "SELECT to_regclass('public.app_metadata') AS table_name",
      ),
    ).resolves.toEqual([{ table_name: null }]);
    await expect(
      dataSource.query(
        "SELECT to_regclass('public.bootstrap_extension_ownership') AS table_name",
      ),
    ).resolves.toEqual([{ table_name: null }]);

    await dataSource.runMigrations();
    await expectExtensions(['citext', 'pg_trgm', 'postgis']);
  });

  async function expectExtensions(expected: string[]): Promise<void> {
    const rows = (await dataSource.query(
      `SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'citext', 'pg_trgm') ORDER BY extname`,
    )) as Array<{ extname: string }>;
    expect(rows.map((row) => row.extname)).toEqual(expected);
  }
});
