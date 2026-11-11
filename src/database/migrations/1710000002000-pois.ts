import { MigrationInterface, QueryRunner } from 'typeorm';

export class Pois1710000002000 implements MigrationInterface {
  name = 'Pois1710000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE poi_categoria AS ENUM (
        'restaurante', 'hospedaje', 'artesania', 'aventura',
        'cultural', 'naturaleza', 'transporte', 'otro'
      );

      CREATE TABLE municipio (
        id uuid PRIMARY KEY,
        nombre varchar(120) NOT NULL UNIQUE,
        es_pueblo_magico boolean NOT NULL DEFAULT false,
        geom_limite geometry(MultiPolygon, 4326),
        centro geometry(Point, 4326)
      );

      CREATE TABLE poi (
        id uuid PRIMARY KEY,
        nombre varchar(150) NOT NULL,
        descripcion text,
        categoria poi_categoria NOT NULL,
        municipio_id uuid NOT NULL REFERENCES municipio(id),
        ubicacion geometry(Point, 4326) NOT NULL,
        direccion varchar(255),
        costo_promedio numeric(10, 2) NOT NULL DEFAULT 0
          CHECK (costo_promedio >= 0),
        horario jsonb NOT NULL,
        contacto jsonb NOT NULL DEFAULT '{}'::jsonb,
        duracion_visita_min smallint NOT NULL DEFAULT 60
          CHECK (duracion_visita_min > 0),
        negocio_id uuid,
        calificacion_promedio numeric(3, 2) NOT NULL DEFAULT 0
          CHECK (calificacion_promedio >= 0 AND calificacion_promedio <= 5),
        numero_resenas integer NOT NULL DEFAULT 0 CHECK (numero_resenas >= 0),
        destacado_hasta timestamptz,
        fotos text[] NOT NULL DEFAULT '{}',
        eliminado_en timestamptz,
        creado_en timestamptz NOT NULL DEFAULT now(),
        UNIQUE (municipio_id, nombre)
      );
      CREATE INDEX poi_ubicacion_gist_idx ON poi USING GIST (ubicacion);
      CREATE INDEX poi_nombre_trgm_idx ON poi USING GIN (nombre gin_trgm_ops);
      CREATE INDEX poi_municipio_categoria_idx ON poi (municipio_id, categoria)
        WHERE eliminado_en IS NULL;
      CREATE INDEX poi_costo_idx ON poi (costo_promedio)
        WHERE eliminado_en IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE poi;
      DROP TABLE municipio;
      DROP TYPE poi_categoria;
    `);
  }
}
