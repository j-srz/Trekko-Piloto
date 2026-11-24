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
EOF
cat > DB-05_Reputacion_Gamificacion_F2.md <<'EOF'
# DB-05 — Reputación y gamificación (Fase 2)

**Fase:** 2 · **Depende de:** DB-04 · **Spec origen:** §3.4, §3.5.2, §3.7.2, §5.3, §5.4 (Tablas 43–46), RF-15, RF-17

## 1. Objetivo
Crear `check_in`, `resena`, `insignia`, `usuario_insignia`, `recompensa`, `canje`, `puntos_movimiento`. (Nota: `check_in.grupo_id` recibe su FK en DB-06.)

## 2. Prerrequisitos
QA-01 de Fase 1 aprobado. DB-04 aplicada.

## 3. Archivos permitidos
`apps/api/src/database/migrations/<ts>-ReputacionGamificacion.ts`, `apps/api/src/database/seeds/insignias.ts`, `apps/api/test/db-gamificacion.e2e-spec.ts`.

## 4. DDL

```sql
CREATE TYPE metodo_checkin AS ENUM ('gps','codigo_grupo');
CREATE TYPE estado_canje   AS ENUM ('generado','usado','expirado','cancelado');

CREATE TABLE check_in (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  poi_id uuid NOT NULL REFERENCES poi(id),
  ubicacion geometry(Point,4326) NOT NULL,
  precision_m numeric(6,1),
  distancia_m numeric(7,1) NOT NULL,
  metodo metodo_checkin NOT NULL,
  grupo_id uuid,                                      -- FK se agrega en DB-06
  fecha timestamptz NOT NULL,                         -- momento real (ocurridoEn)
  op_id uuid NOT NULL,
  puntos_otorgados integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_check_in_op UNIQUE (op_id),
  CONSTRAINT ck_check_in_distancia CHECK (metodo <> 'gps' OR distancia_m <= 100)
);
CREATE INDEX idx_check_in_usuario_fecha ON check_in (usuario_id, fecha DESC);
CREATE INDEX idx_check_in_poi ON check_in (poi_id);

CREATE TABLE resena (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  poi_id uuid NOT NULL REFERENCES poi(id),
  check_in_id uuid NOT NULL REFERENCES check_in(id) ON DELETE RESTRICT,
  criterios jsonb NOT NULL,                           -- { precio, servicio, accesibilidad, facilidadLlegada } enteros 1..5
  calificacion smallint NOT NULL,                     -- promedio(precio, servicio, accesibilidad) redondeado (D-08)
  texto varchar(1000),
  fotos text[] NOT NULL DEFAULT '{}',
  peso numeric(4,2) NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_resena_check_in UNIQUE (check_in_id),
  CONSTRAINT ck_resena_calificacion CHECK (calificacion BETWEEN 1 AND 5),
  CONSTRAINT ck_resena_fotos CHECK (cardinality(fotos) <= 4)
);
CREATE INDEX idx_resena_poi ON resena (poi_id, created_at DESC);
CREATE INDEX idx_resena_usuario ON resena (usuario_id);

CREATE TABLE insignia (
  id smallserial PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  descripcion text NOT NULL,
  requisito jsonb NOT NULL,                           -- regla evaluable: {"tipo":"...", ...}
  icono text,
  patrocinador_negocio_id uuid REFERENCES negocio(id) ON DELETE SET NULL
);
CREATE TABLE usuario_insignia (
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  insignia_id smallint NOT NULL REFERENCES insignia(id),
  fecha timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, insignia_id)
);

CREATE TABLE recompensa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL REFERENCES negocio(id) ON DELETE CASCADE,
  titulo varchar(120) NOT NULL,
  descripcion text,
  costo_puntos integer NOT NULL,
  tope_mensual_usuario smallint NOT NULL DEFAULT 1,
  vigente_desde date NOT NULL DEFAULT current_date,
  vigente_hasta date,
  activa boolean NOT NULL DEFAULT true,
  CONSTRAINT ck_recompensa_costo CHECK (costo_puntos > 0),
  CONSTRAINT ck_recompensa_tope CHECK (tope_mensual_usuario > 0)
);
CREATE TABLE canje (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  recompensa_id uuid NOT NULL REFERENCES recompensa(id),
  codigo_hash text NOT NULL,                          -- sha256 del código del QR (el código en claro solo viaja al usuario)
  estado estado_canje NOT NULL DEFAULT 'generado',
  puntos_descontados integer NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  expira_en timestamptz NOT NULL,
  usado_en timestamptz,
  validado_por uuid REFERENCES usuario(id),
  CONSTRAINT uq_canje_codigo UNIQUE (codigo_hash)
);
CREATE INDEX idx_canje_usuario_mes ON canje (usuario_id, recompensa_id, creado_en);

-- Libro de puntos: base de los límites diarios y de la auditoría (D-04)
CREATE TABLE puntos_movimiento (
  id bigserial PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  accion text NOT NULL,                               -- checkin|resena|resena_foto|ruta_publicada|ruta_usada|municipio_nuevo|canje
  puntos integer NOT NULL,                            -- negativo en canje
  referencia_tipo text,
  referencia_id uuid,
  dia date NOT NULL DEFAULT current_date,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_puntos_accion CHECK (accion IN ('checkin','resena','resena_foto','ruta_publicada','ruta_usada','municipio_nuevo','canje'))
);
CREATE INDEX idx_puntos_usuario_dia ON puntos_movimiento (usuario_id, dia, accion);
CREATE UNIQUE INDEX uq_puntos_referencia ON puntos_movimiento (usuario_id, accion, referencia_id) WHERE referencia_id IS NOT NULL;
```

## 5. Tareas
1. Migración `up/down`.
2. Seed `insignias.ts` con el catálogo de la Tabla 46 (6 insignias) en `requisito` JSON: `checkins_distintos_municipio {municipio:'calvillo',cantidad:3}`, `municipios_visitados {clave:[4 pueblos mágicos]}`, `rutas_tipo_completadas {categoria:'aventura',cantidad:3}`, `resenas_con_foto {cantidad:10}`, `salidas_organizadas {cantidad:10, calificacionMin:4.5}`, `ruta_usada_por {personas:25}`.
3. Tests: `uq_check_in_op` (mismo `op_id` dos veces falla), `uq_resena_check_in` (segunda reseña con el mismo check-in falla), `ck_check_in_distancia` (GPS a 101 m falla), tope de fotos, PK compuesta de `usuario_insignia`.

## 6. Criterios de aceptación
- [ ] DDL exacto y `up/down/up` limpio.
- [ ] Los 5 tests de integridad pasan.
- [ ] 6 insignias sembradas de forma idempotente.

## 7. Prohibido
Guardar el código de canje en claro · agregar columnas calculadas de reputación fuera de `poi`/`usuario` · modificar tablas de DB-02/04.
EOF