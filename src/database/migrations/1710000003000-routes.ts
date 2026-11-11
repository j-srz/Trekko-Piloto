import { MigrationInterface, QueryRunner } from 'typeorm';

export class Routes1710000003000 implements MigrationInterface {
  name = 'Routes1710000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE ruta_tipo AS ENUM ('original', 'comunitaria');
      CREATE TYPE ruta_estado AS ENUM ('borrador', 'validada', 'publicada', 'archivada');

      CREATE TABLE ruta (
        id uuid PRIMARY KEY,
        autor_id uuid REFERENCES usuario(id) ON DELETE SET NULL,
        tipo ruta_tipo NOT NULL,
        estado ruta_estado NOT NULL DEFAULT 'borrador',
        titulo varchar(150) NOT NULL,
        descripcion text,
        costo_estimado numeric(10, 2) NOT NULL DEFAULT 0
          CHECK (costo_estimado >= 0),
        duracion_min integer NOT NULL CHECK (duracion_min > 0),
        municipio_id uuid NOT NULL REFERENCES municipio(id),
        veces_usada integer NOT NULL DEFAULT 0 CHECK (veces_usada >= 0),
        veces_guardada integer NOT NULL DEFAULT 0 CHECK (veces_guardada >= 0),
        ruta_origen_id uuid REFERENCES ruta(id) ON DELETE SET NULL,
        eliminado_en timestamptz,
        creado_en timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE ruta_poi (
        ruta_id uuid NOT NULL REFERENCES ruta(id) ON DELETE CASCADE,
        poi_id uuid NOT NULL REFERENCES poi(id),
        orden smallint NOT NULL CHECK (orden > 0),
        duracion_visita_min smallint NOT NULL CHECK (duracion_visita_min > 0),
        PRIMARY KEY (ruta_id, orden),
        UNIQUE (ruta_id, poi_id)
      );
      CREATE INDEX ruta_publicada_municipio_idx
        ON ruta (municipio_id, tipo) WHERE estado = 'publicada' AND eliminado_en IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE ruta_poi;
      DROP TABLE ruta;
      DROP TYPE ruta_estado;
      DROP TYPE ruta_tipo;
    `);
  }
}
