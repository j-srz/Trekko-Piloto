# DB-04 — Rutas, itinerarios guardados, sync y seed de Trekko Originals

**Fase:** 1 · **Depende de:** DB-03 · **Spec origen:** §3.4 (Tabla 15), §3.5.3, §3.9.1 (Tabla 26), §3.6.4, RF-05…07, RF-09 · **Hito:** H3

## 1. Objetivo
Crear `ruta`, `ruta_poi`, `itinerario`, `itinerario_parada`, `sync_operacion` y sembrar 2–3 rutas **Trekko Originals** (estado `publicada`, autor `sistema`) sobre los POIs demo.

## 2. Prerrequisitos
DB-03 aplicada y seed corrido (existen usuario `sistema` y POIs demo).

## 3. Archivos permitidos
`apps/api/src/database/migrations/<ts>-RutasItinerariosSync.ts`, `apps/api/src/database/seeds/rutas-originals.ts`, `apps/api/test/db-rutas.e2e-spec.ts`.

## 4. DDL

```sql
CREATE TABLE ruta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id uuid NOT NULL REFERENCES usuario(id),
  tipo tipo_ruta NOT NULL,
  estado estado_ruta NOT NULL DEFAULT 'borrador',      -- SOLO borrador|validada|publicada (§3.9.1)
  titulo varchar(120) NOT NULL,
  descripcion text,
  municipio_id smallint NOT NULL REFERENCES municipio(id),
  costo_estimado numeric(10,2) NOT NULL DEFAULT 0,
  duracion_min integer NOT NULL DEFAULT 0,
  usos integer NOT NULL DEFAULT 0,
  guardados integer NOT NULL DEFAULT 0,
  publicada_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_ruta_publicada CHECK (estado <> 'publicada' OR publicada_en IS NOT NULL),
  CONSTRAINT ck_ruta_costo CHECK (costo_estimado >= 0)
);
CREATE INDEX idx_ruta_estado_tipo ON ruta (estado, tipo);
CREATE INDEX idx_ruta_autor ON ruta (autor_id);
CREATE INDEX idx_ruta_municipio ON ruta (municipio_id);
CREATE TRIGGER trg_ruta_updated BEFORE UPDATE ON ruta FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE ruta_poi (
  ruta_id uuid NOT NULL REFERENCES ruta(id) ON DELETE CASCADE,   -- composición: sin ruta no hay paradas
  poi_id uuid NOT NULL REFERENCES poi(id) ON DELETE RESTRICT,
  orden smallint NOT NULL,
  duracion_visita_min smallint NOT NULL,
  PRIMARY KEY (ruta_id, poi_id),
  CONSTRAINT ck_ruta_poi_orden CHECK (orden > 0),
  CONSTRAINT ck_ruta_poi_duracion CHECK (duracion_visita_min BETWEEN 5 AND 480),
  CONSTRAINT uq_ruta_poi_orden UNIQUE (ruta_id, orden) DEFERRABLE INITIALLY DEFERRED
);

-- Itinerario generado y guardado por un usuario (RF-07)
CREATE TABLE itinerario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  titulo varchar(120),
  municipio_id smallint NOT NULL REFERENCES municipio(id),
  fecha_viaje date NOT NULL,
  presupuesto_mxn numeric(10,2) NOT NULL,
  duracion_solicitada_min integer NOT NULL,
  intereses text[] NOT NULL DEFAULT '{}',
  parametros jsonb NOT NULL,
  costo_total numeric(10,2) NOT NULL,
  duracion_total_min integer NOT NULL,
  desglose jsonb NOT NULL,
  advertencias jsonb NOT NULL DEFAULT '[]'::jsonb,
  origen_ruta_id uuid REFERENCES ruta(id) ON DELETE SET NULL,
  op_id uuid,                                         -- idempotencia del guardado
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX uq_itinerario_usuario_op ON itinerario (usuario_id, op_id) WHERE op_id IS NOT NULL;
CREATE INDEX idx_itinerario_usuario ON itinerario (usuario_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_itinerario_updated BEFORE UPDATE ON itinerario FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE itinerario_parada (
  itinerario_id uuid NOT NULL REFERENCES itinerario(id) ON DELETE CASCADE,
  dia smallint NOT NULL DEFAULT 1,
  orden smallint NOT NULL,
  poi_id uuid NOT NULL REFERENCES poi(id),
  hora_llegada time NOT NULL,
  duracion_visita_min smallint NOT NULL,
  costo numeric(10,2) NOT NULL DEFAULT 0,
  traslado_km numeric(6,2),
  traslado_min smallint,
  traslado_costo numeric(10,2),
  PRIMARY KEY (itinerario_id, dia, orden)
);

-- Registro de operaciones offline procesadas (idempotencia global de /sync)
CREATE TABLE sync_operacion (
  op_id uuid PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  estado text NOT NULL,
  resultado jsonb,
  motivo_rechazo text,
  ocurrido_en timestamptz,
  recibido_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_sync_operacion_estado CHECK (estado IN ('ok','rechazada'))
);
CREATE INDEX idx_sync_operacion_usuario ON sync_operacion (usuario_id, recibido_en DESC);
```

## 5. Tareas
1. Migración con `up/down` simétricos (orden inverso en `down`).
2. Seed `rutas-originals.ts`: 2–3 rutas `tipo='original'`, `estado='publicada'`, `autor_id` = usuario `sistema`, 3–4 paradas cada una sobre POIs demo del mismo municipio, `costo_estimado` y `duracion_min` calculados con la misma regla que BACK-04 (suma de costos + traslados). Idempotente.
3. Test: orden único por ruta (con `DEFERRABLE` se puede intercambiar el orden de dos paradas en una sola transacción), un `itinerario` con el mismo `(usuario_id, op_id)` no se duplica, `estado_ruta` rechaza valores fuera del enum, borrar una ruta borra sus paradas.

## 6. Criterios de aceptación
- [ ] DDL exacto; `up/down/up` limpio.
- [ ] Seed idempotente con ≥ 2 rutas publicadas.
- [ ] Los tests de restricciones pasan.
- [ ] `estado_ruta` **no** contiene valores de las etapas 5–7 del ciclo de vida.

## 7. Prohibido
Agregar columnas de grupo/viaje a `ruta` · cambiar el enum de estados · semillas con autor distinto de `sistema`.
