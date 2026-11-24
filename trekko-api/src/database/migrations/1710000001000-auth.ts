import { MigrationInterface, QueryRunner } from 'typeorm';

export class Auth1710000001000 implements MigrationInterface {
  name = 'Auth1710000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE usuario_modo AS ENUM ('explorador', 'creador', 'anfitrion');
      CREATE TYPE usuario_estado AS ENUM ('activo', 'restringido', 'bloqueado', 'eliminado');
      CREATE TYPE app_rol AS ENUM ('explorador', 'creador', 'anfitrion', 'entidad', 'admin');

      CREATE TABLE usuario (
        id uuid PRIMARY KEY,
        nombre varchar(100) NOT NULL,
        correo citext NOT NULL UNIQUE,
        hash_password varchar,
        modo_activo usuario_modo NOT NULL DEFAULT 'explorador',
        reputacion integer NOT NULL DEFAULT 0 CHECK (reputacion >= 0),
        puntos_saldo integer NOT NULL DEFAULT 0 CHECK (puntos_saldo >= 0),
        perfil_verificado boolean NOT NULL DEFAULT false,
        estado usuario_estado NOT NULL DEFAULT 'activo',
        restringido_hasta timestamptz,
        intentos_fallidos smallint NOT NULL DEFAULT 0 CHECK (intentos_fallidos >= 0),
        bloqueado_login_hasta timestamptz,
        foto_url varchar,
        fecha_registro timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE usuario_rol (
        usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
        rol app_rol NOT NULL,
        PRIMARY KEY (usuario_id, rol)
      );

      CREATE TABLE refresh_token (
        id uuid PRIMARY KEY,
        usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
        familia_id uuid NOT NULL,
        token_hash char(64) NOT NULL UNIQUE,
        expira_en timestamptz NOT NULL,
        revocado_en timestamptz,
        reemplazado_por uuid REFERENCES refresh_token(id),
        dispositivo varchar(255),
        ip varchar(64),
        creado_en timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX refresh_token_familia_idx ON refresh_token(familia_id);
      CREATE INDEX usuario_bloqueado_login_idx ON usuario(bloqueado_login_hasta);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE refresh_token;
      DROP TABLE usuario_rol;
      DROP TABLE usuario;
      DROP TYPE app_rol;
      DROP TYPE usuario_estado;
      DROP TYPE usuario_modo;
    `);
  }
}
