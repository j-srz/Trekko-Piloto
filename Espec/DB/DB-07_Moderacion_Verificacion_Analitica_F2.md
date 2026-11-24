# DB-07 — Moderación, verificación, promociones, métricas y analítica (Fase 2)

**Fase:** 2 · **Depende de:** DB-06 · **Spec origen:** §2.6, §3.3, §3.5.1, §3.7.3, §5.3 (Tabla 44), §6.3 (Tabla 49), RF-18…21

## 1. Objetivo
Crear `verificacion_identidad`, `reporte`, `sancion`, `promocion`, `poi_evento` y las **vistas agregadas** de analítica con umbral mínimo de privacidad (k ≥ 5).

## 2. Prerrequisitos
DB-06 aplicada.

## 3. Archivos permitidos
`apps/api/src/database/migrations/<ts>-ModeracionVerificacionAnalitica.ts`, `apps/api/test/db-moderacion.e2e-spec.ts`.

## 4. DDL

```sql
CREATE TYPE estado_verificacion AS ENUM ('pendiente','aprobada','rechazada','purgada');
CREATE TYPE estado_reporte      AS ENUM ('abierto','validado','descartado');
CREATE TYPE tipo_sancion        AS ENUM ('advertencia','suspension','bloqueo');

CREATE TABLE verificacion_identidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,   -- composición (§3.5.1)
  tipo_documento text NOT NULL,
  objeto_clave text,                                   -- clave del objeto CIFRADO en el almacén; NULL tras la purga
  estado estado_verificacion NOT NULL DEFAULT 'pendiente',
  solicitada_en timestamptz NOT NULL DEFAULT now(),
  fecha_purga timestamptz NOT NULL,                    -- conservar solo lo necesario (§3.5.1)
  revisada_por uuid REFERENCES usuario(id),
  revisada_en timestamptz,
  CONSTRAINT ck_verif_tipo CHECK (tipo_documento IN ('ine','pasaporte','cedula'))
);
CREATE INDEX idx_verif_usuario ON verificacion_identidad (usuario_id);
CREATE INDEX idx_verif_purga ON verificacion_identidad (fecha_purga) WHERE estado <> 'purgada';

CREATE TABLE reporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reportante_id uuid NOT NULL REFERENCES usuario(id),
  reportado_id uuid NOT NULL REFERENCES usuario(id),
  grupo_id uuid REFERENCES grupo(id) ON DELETE SET NULL,
  viaje_id uuid REFERENCES viaje_activo(id) ON DELETE SET NULL,
  motivo text NOT NULL,
  gravedad text NOT NULL,
  descripcion varchar(1000) NOT NULL,
  estado estado_reporte NOT NULL DEFAULT 'abierto',
  revisado_por uuid REFERENCES usuario(id),
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_reporte_distintos CHECK (reportante_id <> reportado_id),
  CONSTRAINT ck_reporte_gravedad CHECK (gravedad IN ('leve','grave'))
);
CREATE INDEX idx_reporte_reportado ON reporte (reportado_id, estado);
CREATE UNIQUE INDEX uq_reporte_abierto ON reporte (reportante_id, reportado_id, viaje_id) WHERE estado = 'abierto' AND viaje_id IS NOT NULL;

CREATE TABLE sancion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  reporte_id uuid REFERENCES reporte(id),
  tipo tipo_sancion NOT NULL,
  inicio timestamptz NOT NULL DEFAULT now(),
  fin timestamptz,                                     -- NULL = indefinida (bloqueo)
  motivo text NOT NULL,
  CONSTRAINT ck_sancion_fin CHECK (fin IS NULL OR fin > inicio)
);
CREATE INDEX idx_sancion_vigente ON sancion (usuario_id, fin);

CREATE TABLE promocion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL REFERENCES negocio(id) ON DELETE CASCADE,
  titulo varchar(120) NOT NULL,
  descripcion varchar(500),
  inicio date NOT NULL,
  fin date NOT NULL,
  activa boolean NOT NULL DEFAULT true,
  CONSTRAINT ck_promocion_fechas CHECK (fin >= inicio)
);
CREATE INDEX idx_promocion_negocio ON promocion (negocio_id, activa);

CREATE TABLE poi_evento (                              -- estadísticas del prestador (§5.2)
  id bigserial PRIMARY KEY,
  poi_id uuid NOT NULL REFERENCES poi(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_poi_evento_tipo CHECK (tipo IN ('vista','contacto_whatsapp','contacto_llamada','guardado'))
);                                                     -- sin usuario_id a propósito: dato ya anonimizado
CREATE INDEX idx_poi_evento_poi_fecha ON poi_evento (poi_id, creado_en);

-- Analítica: SOLO agregados, con umbral mínimo de 5 usuarios distintos (privacidad)
CREATE VIEW vw_analitica_visitas_mes AS
SELECT p.municipio_id, p.categoria_id, date_trunc('month', c.fecha)::date AS mes,
       count(*) AS total_checkins, count(DISTINCT c.usuario_id) AS usuarios_distintos
FROM check_in c JOIN poi p ON p.id = c.poi_id
GROUP BY p.municipio_id, p.categoria_id, date_trunc('month', c.fecha)
HAVING count(DISTINCT c.usuario_id) >= 5;

CREATE VIEW vw_analitica_rutas_populares AS
SELECT r.id AS ruta_id, r.municipio_id, r.titulo, r.usos
FROM ruta r WHERE r.estado = 'publicada' AND r.usos >= 5;
```

## 5. Tareas
1. Migración `up/down`.
2. Tests: celdas con < 5 usuarios **no** aparecen en `vw_analitica_visitas_mes`; no se puede reportar a uno mismo; un bloqueo con `fin` NULL se considera vigente; `poi_evento` no tiene columna de usuario.

## 6. Criterios de aceptación
- [ ] DDL exacto y `up/down/up` limpio.
- [ ] Las vistas no exponen ningún identificador de persona.
- [ ] `fecha_purga` es obligatoria.

## 7. Prohibido
Vistas con `usuario_id` · almacenar la imagen del documento en la BD (solo la clave del objeto cifrado).
