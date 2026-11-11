import { MigrationInterface, QueryRunner } from 'typeorm';

export class Bootstrap1710000000000 implements MigrationInterface {
  name = 'Bootstrap1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE bootstrap_extension_ownership (
        extension_name TEXT PRIMARY KEY
      );
    `);

    for (const extension of ['postgis', 'citext', 'pg_trgm']) {
      const installed = (await queryRunner.query(
        'SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = $1) AS installed',
        [extension],
      )) as Array<{ installed: boolean }>;
      if (!installed[0]?.installed) {
        await queryRunner.query(`CREATE EXTENSION "${extension}";`);
        await queryRunner.query(
          'INSERT INTO bootstrap_extension_ownership (extension_name) VALUES ($1)',
          [extension],
        );
      }
    }

    await queryRunner.query(`
      CREATE TABLE app_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const ownedExtensions = (await queryRunner.query(
      'SELECT extension_name FROM bootstrap_extension_ownership',
    )) as Array<{ extension_name: string }>;
    await queryRunner.query('DROP TABLE app_metadata;');
    await queryRunner.query('DROP TABLE bootstrap_extension_ownership;');

    for (const extension of ['pg_trgm', 'citext', 'postgis']) {
      if (ownedExtensions.some((owned) => owned.extension_name === extension)) {
        await queryRunner.query(`DROP EXTENSION "${extension}";`);
      }
    }
  }
}
