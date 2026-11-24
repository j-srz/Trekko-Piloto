# DB-06 — Social, grupos y Viaje Activo (Fase 2)

**Fase:** 2 · **Depende de:** DB-05 · **Spec origen:** §3.4, §3.5.3, §3.6.4, §3.8.4 (Tabla 25), §3.12, §5.1, §5.3 · **RF:** 10–14, 16

## 1. Objetivo
Crear `grupo`, `grupo_miembro`, `viaje_activo`, `evento_viaje`, `voto`, `asistencia`, `calificacion_par`, `dispositivo_push`, y completar la FK `check_in.grupo_id`.

## 2. Prerrequisitos
DB-05 aplicada.

## 3. Archivos permitidos
`apps/api/src/database/migrations/<ts>-SocialGruposViaje.ts`, `apps/api/test/db-social.e2e-spec.ts`.

## 4. DDL

```sql
CREATE TYPE estado_grupo   AS ENUM ('abierto','lleno','en_viaje','finalizado','cancelado');
CREATE TYPE estado_viaje   AS ENUM ('programado','en_espera','activo','en_votacion','finalizado','resenado','cancelado');
CREATE TYPE estado_evento  AS ENUM ('pendiente','actual','completado','omitido');
CREATE TYPE opcion_voto    AS ENUM ('a_favor','en_contra');

CREATE TABLE grupo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id uuid NOT NULL REFERENCES ruta(id) ON DELETE RESTRICT,
  organizador_id uuid NOT NULL REFERENCES usuario(id),
  titulo varchar(120) NOT NULL,
  cupo smallint NOT NULL,
  miembros_count smallint NOT NULL DEFAULT 1,         -- se modifica SOLO dentro de la transacción de unirse/salir
  fecha timestamptz NOT NULL,
  estado estado_grupo NOT NULL DEFAULT 'abierto',
  punto_encuentro geometry(Point,4326) NOT NULL,
  punto_encuentro_nombre varchar(150) NOT NULL,
  tolerancia_min smallint NOT NULL DEFAULT 15,
  recurrente boolean NOT NULL DEFAULT false,
  recurrencia jsonb,                                  -- { dias:[0..6], hora:'HH:mm' }
  secreto_grupo bytea NOT NULL,                       -- AES-256-GCM: iv‖tag‖ciphertext (nunca en claro)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_grupo_cupo CHECK (cupo >= 2),
  CONSTRAINT ck_grupo_miembros CHECK (miembros_count >= 0 AND miembros_count <= cupo),
  CONSTRAINT ck_grupo_tolerancia CHECK (tolerancia_min BETWEEN 5 AND 60),
  CONSTRAINT ck_grupo_recurrencia CHECK (NOT recurrente OR recurrencia IS NOT NULL)
);
CREATE INDEX idx_grupo_estado_fecha ON grupo (estado, fecha);
CREATE INDEX idx_grupo_organizador ON grupo (organizador_id);
CREATE INDEX idx_grupo_punto_geog ON grupo USING GIST ((punto_encuentro::geography));
CREATE TRIGGER trg_grupo_updated BEFORE UPDATE ON grupo FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE grupo_miembro (
  grupo_id uuid NOT NULL REFERENCES grupo(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  fecha_union timestamptz NOT NULL DEFAULT now(),
  estado text NOT NULL DEFAULT 'activo',
  PRIMARY KEY (grupo_id, usuario_id),                 -- evita unirse dos veces (§3.4)
  CONSTRAINT ck_grupo_miembro_estado CHECK (estado IN ('activo','salio','expulsado'))
);
CREATE INDEX idx_grupo_miembro_usuario ON grupo_miembro (usuario_id);

CREATE TABLE viaje_activo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES grupo(id) ON DELETE CASCADE,
  estado estado_viaje NOT NULL DEFAULT 'programado',
  ocurrencia_fecha date NOT NULL,
  evento_actual_id uuid,                              -- FK abajo
  hora_inicio timestamptz,
  tolerancia_vence_en timestamptz,
  finalizado_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- "un viaje activo por grupo": solo uno no terminado a la vez (permite grupos recurrentes)
CREATE UNIQUE INDEX uq_viaje_activo_vigente ON viaje_activo (grupo_id) WHERE estado NOT IN ('finalizado','resenado','cancelado');
CREATE TRIGGER trg_viaje_updated BEFORE UPDATE ON viaje_activo FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE evento_viaje (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id uuid NOT NULL REFERENCES viaje_activo(id) ON DELETE CASCADE,
  orden smallint NOT NULL,
  poi_id uuid NOT NULL REFERENCES poi(id),
  estado estado_evento NOT NULL DEFAULT 'pendiente',
  hora_estimada timestamptz,
  propuesta jsonb,                                    -- { tipo:'saltar'|'alternativa', poiAlternativoId?, cierraEn }
  CONSTRAINT uq_evento_viaje_orden UNIQUE (viaje_id, orden)
);
ALTER TABLE viaje_activo ADD CONSTRAINT fk_viaje_evento_actual FOREIGN KEY (evento_actual_id) REFERENCES evento_viaje(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE voto (
  viaje_id uuid NOT NULL REFERENCES viaje_activo(id) ON DELETE CASCADE,
  evento_id uuid NOT NULL REFERENCES evento_viaje(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuario(id),
  opcion opcion_voto NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (evento_id, usuario_id)                 -- un voto por usuario y evento
);

-- Asistencia al punto de encuentro (online o sincronizada) — D-04
CREATE TABLE asistencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id uuid NOT NULL REFERENCES viaje_activo(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuario(id),
  op_id uuid NOT NULL,
  metodo text NOT NULL,                               -- 'gps' | 'codigo'
  ubicacion geometry(Point,4326),
  distancia_m numeric(7,1),
  ocurrido_en timestamptz NOT NULL,
  verificado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_asistencia_op UNIQUE (op_id),
  CONSTRAINT uq_asistencia_viaje_usuario UNIQUE (viaje_id, usuario_id)
);

CREATE TABLE calificacion_par (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id uuid NOT NULL REFERENCES viaje_activo(id) ON DELETE CASCADE,
  evaluador_id uuid NOT NULL REFERENCES usuario(id),
  evaluado_id uuid NOT NULL REFERENCES usuario(id),
  puntualidad smallint NOT NULL,
  respeto smallint NOT NULL,
  convivencia smallint NOT NULL,
  etiquetas text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_calificacion_par UNIQUE (viaje_id, evaluador_id, evaluado_id),
  CONSTRAINT ck_calificacion_par_distintos CHECK (evaluador_id <> evaluado_id),
  CONSTRAINT ck_calificacion_par_rango CHECK (puntualidad BETWEEN 1 AND 5 AND respeto BETWEEN 1 AND 5 AND convivencia BETWEEN 1 AND 5)
);
CREATE INDEX idx_calificacion_par_evaluado ON calificacion_par (evaluado_id);

CREATE TABLE dispositivo_push (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  token text NOT NULL,
  plataforma text NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_dispositivo_token UNIQUE (token),
  CONSTRAINT ck_dispositivo_plataforma CHECK (plataforma IN ('ios','android'))
);

ALTER TABLE check_in ADD CONSTRAINT fk_check_in_grupo FOREIGN KEY (grupo_id) REFERENCES grupo(id) ON DELETE SET NULL;
```

## 5. Tareas
1. Migración `up/down`.
2. Pruebas de integridad y **concurrencia** (obligatorias, RNF-10):
   - Dos transacciones simultáneas intentan ocupar el último lugar con `SELECT … FOR UPDATE` sobre `grupo`: exactamente una tiene éxito; la otra viola `ck_grupo_miembros` o ve `miembros_count = cupo`.
   - Insertar dos veces `(grupo_id, usuario_id)` falla.
   - Dos viajes vigentes para el mismo grupo → falla; tras `finalizado` se permite otro.
   - Segundo voto del mismo usuario en un evento falla.
   - Calificarse a sí mismo falla.

## 6. Criterios de aceptación
- [ ] DDL exacto; `up/down/up` limpio.
- [ ] La prueba de concurrencia de cupo pasa 20 veces seguidas.
- [ ] `secreto_grupo` no tiene valor por defecto ni se expone en ninguna vista.

## 7. Prohibido
Agregar el estado `cancelado` a `viaje_activo.estado` con otro nombre · quitar `DEFERRABLE` de las FKs circulares · guardar el secreto sin cifrar.
