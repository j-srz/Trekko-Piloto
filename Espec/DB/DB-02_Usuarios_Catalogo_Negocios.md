# DB-02 — Usuarios, catálogo, negocios y POIs

**Fase:** 1 · **Depende de:** DB-01 · **Spec origen:** §3.4 (Tabla 15), §3.5.1, §3.7, §5.1, §6.3 (Tabla 49) · **RF:** 01, 02, 03, 04, 08 · **Hito:** H2

## 1. Objetivo
Crear las tablas `municipio`, `categoria`, `usuario`, `refresh_token`, `negocio`, `suscripcion`, `poi` con sus restricciones e índices, en **una migración** `CatalogoUsuariosNegocios`.

## 2. Prerrequisitos
`db:migrate` de DB-01 aplicada. Verificar: `\dx` muestra postgis, pgcrypto, citext, pg_trgm.

## 3. Archivos permitidos
`apps/api/src/database/migrations/<ts>-CatalogoUsuariosNegocios.ts` y `apps/api/test/db-esquema-f1.e2e-spec.ts`.

## 4. DDL (copiar tal cual; no renombrar columnas)

```sql
CREATE TABLE municipio (
  id smallserial PRIMARY KEY,
  clave text NOT NULL UNIQUE,                       -- ej. 'calvillo'
  nombre text NOT NULL,
  es_pueblo_magico boolean NOT NULL DEFAULT false,
  centroide geometry(Point,4326) NOT NULL
);

CREATE TABLE categoria (
  id smallserial PRIMARY KEY,
  slug text NOT NULL UNIQUE,                        -- restaurante, hospedaje, artesania, atractivo, aventura, guia
  nombre text NOT NULL,
  tipo_gasto text NOT NULL,                         -- para desglosar el costo del itinerario
  icono text,
  CONSTRAINT ck_categoria_tipo_gasto CHECK (tipo_gasto IN ('comida','hospedaje','acceso','compra','actividad','otro'))
);

CREATE TABLE usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(80) NOT NULL,
  correo citext NOT NULL,
  hash_password text,                               -- bcrypt; NULL solo con proveedor social
  proveedor_auth text NOT NULL DEFAULT 'local',
  proveedor_id text,
  roles rol_usuario[] NOT NULL DEFAULT ARRAY['explorador']::rol_usuario[],
  modo_activo rol_usuario NOT NULL DEFAULT 'explorador',
  reputacion numeric(3,2) NOT NULL DEFAULT 0,
  puntos integer NOT NULL DEFAULT 0,
  perfil_verificado boolean NOT NULL DEFAULT false,
  estado estado_cuenta NOT NULL DEFAULT 'activa',
  acepto_aviso_en timestamptz NOT NULL,
  fecha_registro timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_usuario_correo UNIQUE (correo),
  CONSTRAINT ck_usuario_proveedor CHECK (proveedor_auth IN ('local','google','apple')),
  CONSTRAINT ck_usuario_password CHECK (hash_password IS NOT NULL OR proveedor_auth <> 'local'),
  CONSTRAINT ck_usuario_modo_en_roles CHECK (modo_activo = ANY(roles)),
  CONSTRAINT ck_usuario_puntos CHECK (puntos >= 0),
  CONSTRAINT ck_usuario_reputacion CHECK (reputacion BETWEEN 0 AND 5)
);
CREATE UNIQUE INDEX uq_usuario_proveedor ON usuario (proveedor_auth, proveedor_id) WHERE proveedor_id IS NOT NULL;
CREATE TRIGGER trg_usuario_updated BEFORE UPDATE ON usuario FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Rotación de refresh tokens con detección de reutilización (RF-02, A07)
CREATE TABLE refresh_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  familia_id uuid NOT NULL,
  token_hash text NOT NULL,                         -- sha256 hex del token opaco
  expira_en timestamptz NOT NULL,
  usado_en timestamptz,
  revocado_en timestamptz,
  creado_en timestamptz NOT NULL DEFAULT now(),
  ip inet,
  user_agent text,
  CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash)
);
CREATE INDEX idx_refresh_token_usuario ON refresh_token (usuario_id);
CREATE INDEX idx_refresh_token_familia ON refresh_token (familia_id);

CREATE TABLE negocio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  propietario_id uuid REFERENCES usuario(id) ON DELETE SET NULL,   -- NULL hasta que se reclame (F2) o lo asigne el equipo
  nombre varchar(120) NOT NULL,
  categoria_id smallint NOT NULL REFERENCES categoria(id),
  contacto jsonb NOT NULL DEFAULT '{}'::jsonb,
  verificado boolean NOT NULL DEFAULT false,        -- propiedad verificada
  creado_por uuid REFERENCES usuario(id),           -- admin que lo dio de alta
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_negocio_propietario ON negocio (propietario_id);
CREATE TRIGGER trg_negocio_updated BEFORE UPDATE ON negocio FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE suscripcion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL REFERENCES negocio(id) ON DELETE CASCADE,
  plan plan_suscripcion NOT NULL DEFAULT 'gratuito',
  estado estado_suscripcion NOT NULL DEFAULT 'pendiente',
  vigencia_inicio date,
  vigencia_fin date,
  monto_mxn numeric(10,2) NOT NULL DEFAULT 200,
  enlace_pago text,
  referencia_pasarela text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_suscripcion_vigencia CHECK (vigencia_fin IS NULL OR vigencia_inicio IS NULL OR vigencia_fin >= vigencia_inicio)
);
CREATE UNIQUE INDEX uq_suscripcion_activa_por_negocio ON suscripcion (negocio_id) WHERE estado = 'activa';
CREATE UNIQUE INDEX uq_suscripcion_referencia ON suscripcion (referencia_pasarela) WHERE referencia_pasarela IS NOT NULL;

CREATE TABLE poi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(150) NOT NULL,
  descripcion text,
  categoria_id smallint NOT NULL REFERENCES categoria(id),
  municipio_id smallint NOT NULL REFERENCES municipio(id),
  ubicacion geometry(Point,4326) NOT NULL,
  direccion text,
  costo_promedio numeric(10,2) NOT NULL DEFAULT 0,
  duracion_visita_min smallint NOT NULL DEFAULT 60,
  horario jsonb NOT NULL DEFAULT '{}'::jsonb,       -- ver formato en CONTRATO_API_REST §4.2
  contacto jsonb NOT NULL DEFAULT '{}'::jsonb,      -- { telefono, whatsapp (E.164), sitioWeb }
  fotos text[] NOT NULL DEFAULT '{}',
  negocio_id uuid REFERENCES negocio(id) ON DELETE SET NULL,
  destacado boolean NOT NULL DEFAULT false,         -- lo mantiene el módulo catalogo al escuchar eventos de suscripción
  punto_seguro boolean NOT NULL DEFAULT false,      -- sugerible como punto de encuentro (F2)
  calificacion_promedio numeric(3,2) NOT NULL DEFAULT 0,
  num_resenas integer NOT NULL DEFAULT 0,
  puntuacion_visible numeric(3,2),                  -- promedio ponderado (§5.3)
  verificado_en_campo boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_poi_srid CHECK (ST_SRID(ubicacion) = 4326),
  CONSTRAINT ck_poi_costo CHECK (costo_promedio >= 0),
  CONSTRAINT ck_poi_duracion CHECK (duracion_visita_min > 0)
);
CREATE INDEX idx_poi_ubicacion_gist  ON poi USING GIST (ubicacion);
CREATE INDEX idx_poi_ubicacion_geog  ON poi USING GIST ((ubicacion::geography));   -- ST_DWithin en metros
CREATE INDEX idx_poi_categoria       ON poi (categoria_id);
CREATE INDEX idx_poi_municipio       ON poi (municipio_id);
CREATE INDEX idx_poi_updated         ON poi (updated_at);
CREATE INDEX idx_poi_negocio         ON poi (negocio_id);
CREATE INDEX idx_poi_nombre_trgm     ON poi USING GIN (nombre gin_trgm_ops);
CREATE TRIGGER trg_poi_updated BEFORE UPDATE ON poi FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```
`down`: `DROP TABLE` en orden inverso de dependencias.

## 5. Tareas
1. Escribir la migración con el DDL exacto y su `down`.
2. Test `db-esquema-f1.e2e-spec.ts` que verifica: unicidad de correo (insensible a mayúsculas), `ck_usuario_modo_en_roles`, un solo `suscripcion` activa por negocio, rechazo de un POI con SRID distinto de 4326, y que `EXPLAIN` de una consulta `ST_DWithin(ubicacion::geography, …)` use `idx_poi_ubicacion_geog` (con ≥ 1 000 filas de prueba).
3. Subir `up → down → up` sobre BD vacía sin errores.

## 6. Criterios de aceptación
- [ ] Todas las tablas, columnas, checks e índices existen **con los nombres del DDL**.
- [ ] `up/down/up` limpio.
- [ ] El test de plan de consulta confirma uso del índice geográfico.
- [ ] `correo` es único sin importar mayúsculas.
- [ ] Ninguna columna `hash_password` aparece en logs ni seeds.

## 7. Prohibido
Agregar tablas de Fase 2 · renombrar columnas · cambiar `geometry` por `geography` en la columna · quitar `ON DELETE` definidos.
