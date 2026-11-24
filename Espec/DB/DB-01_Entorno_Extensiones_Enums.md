# DB-01 — Entorno de base de datos, extensiones, enums y utilidades

**Fase:** 1 · **Depende de:** — · **Spec origen:** §3.1, §3.2, §3.4, RNF-10 · **Hito:** H1

## 1. Objetivo
Dejar PostgreSQL + PostGIS corriendo en local y en pruebas, con el sistema de migraciones listo y los tipos base (extensiones, enums, función de `updated_at`). **No se crean tablas de negocio en este paso.**

## 2. Prerrequisitos
- Docker instalado. Repositorio con la estructura de `01_REGLAS_GLOBALES…` §2 (al menos `infra/docker/` y `apps/api/src/database/`).

## 3. Archivos permitidos
`infra/docker/docker-compose.dev.yml`, `infra/docker/initdb/01-extensiones.sql`, `apps/api/src/database/data-source.ts`, `apps/api/src/database/migrations/<ts>-Base.ts`, `apps/api/.env.example`, `docs/DECISIONES.md`.

## 4. Tareas (un commit por tarea)

1. **Docker de desarrollo.** `docker-compose.dev.yml` con imagen `postgis/postgis` (versión fijada, no `latest`), volumen nombrado, puerto solo en `127.0.0.1`, dos BD: `trekko_dev` y `trekko_test` (script en `initdb/`). Healthcheck con `pg_isready`.
2. **DataSource de migraciones.** `data-source.ts` (TypeORM) leyendo `DATABASE_URL`; `synchronize: false`; `migrationsRun: false`; carpeta `migrations/`. Scripts en `apps/api/package.json`: `db:migrate`, `db:revert`, `db:migrate:test`.
3. **Migración `Base`** (`up` y `down` simétricos) con:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- correo insensible a mayúsculas
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- búsqueda por nombre

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- Enums Fase 1 (los de Fase 2 se crean en DB-05/06/07)
CREATE TYPE rol_usuario        AS ENUM ('explorador','creador','anfitrion','institucional','admin');
CREATE TYPE estado_cuenta      AS ENUM ('activa','suspendida','bloqueada');
CREATE TYPE tipo_ruta          AS ENUM ('original','comunitaria');
CREATE TYPE estado_ruta        AS ENUM ('borrador','validada','publicada');
CREATE TYPE plan_suscripcion   AS ENUM ('gratuito','premium');
CREATE TYPE estado_suscripcion AS ENUM ('pendiente','activa','vencida','cancelada');
```
`down` elimina enums, función y extensiones **solo si** no hay dependencias (orden inverso).

4. **Verificación de PostGIS** con un test de integración (`apps/api/test/db-base.e2e-spec.ts`): `SELECT PostGIS_Version()` responde y `ST_DWithin` funciona con `geography`.
5. **Documentar** en `docs/DECISIONES.md` la versión exacta de Postgres/PostGIS elegida.

## 5. Reglas obligatorias
- Migraciones siempre con `down` funcional. Nunca editar una migración ya aplicada en un entorno compartido: se crea otra nueva.
- Nombres: `<timestamp>-<NombrePascal>.ts`. Constraints con prefijos `ck_`, `uq_`, `idx_` (ver 01 §3).
- Credenciales solo por variables de entorno; `.env.example` sin valores reales.

## 6. Criterios de aceptación
- [ ] `docker compose up -d` deja ambas BD saludables.
- [ ] `pnpm --filter api db:migrate` y `db:revert` funcionan sobre BD vacía, repetidamente.
- [ ] `PostGIS_Version()` responde en `trekko_dev` y `trekko_test`.
- [ ] La BD solo escucha en `127.0.0.1`.
- [ ] No existe ninguna tabla de negocio todavía.

## 7. Prohibido
`synchronize: true` · usar la imagen `latest` · crear tablas en este paso · exponer el puerto 5432 a la red.
