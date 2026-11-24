# TREKKO — Especificación Técnica del Backend

> **Documento fuente de verdad para el desarrollo del backend.**
> Cualquier agente o desarrollador (incluido GitHub Copilot) debe leer este documento completo antes de escribir código.
> Idioma del dominio: **español** (nombres de entidades de negocio, mensajes al usuario). Idioma del código: **inglés** para identificadores técnicos (clases, funciones, variables); los nombres de tablas y campos de dominio se definen explícitamente en la sección 5.

---

## Índice

1. [Contexto y objetivo](#1-contexto-y-objetivo)
2. [Alcance y fases](#2-alcance-y-fases)
3. [Stack tecnológico y decisiones](#3-stack-tecnológico-y-decisiones)
4. [Arquitectura y estructura del repositorio](#4-arquitectura-y-estructura-del-repositorio)
5. [Modelo de datos](#5-modelo-de-datos)
6. [Convenciones de API](#6-convenciones-de-api)
7. [Módulos y endpoints](#7-módulos-y-endpoints)
8. [Reglas de negocio críticas](#8-reglas-de-negocio-críticas)
9. [Tiempo real (WebSocket)](#9-tiempo-real-websocket)
10. [Sincronización offline-first](#10-sincronización-offline-first)
11. [Seguridad](#11-seguridad)
12. [Privacidad y datos personales](#12-privacidad-y-datos-personales)
13. [Estrategia de pruebas](#13-estrategia-de-pruebas)
14. [Infraestructura, DevOps y observabilidad](#14-infraestructura-devops-y-observabilidad)
15. [Seeds y datos iniciales](#15-seeds-y-datos-iniciales)
16. [Plan de implementación por hitos](#16-plan-de-implementación-por-hitos)
17. [Definition of Done global](#17-definition-of-done-global)
18. [Supuestos, ambigüedades y decisiones abiertas](#18-supuestos-ambigüedades-y-decisiones-abiertas)
19. [Anexos](#19-anexos)

---

## 1. Contexto y objetivo

**Trekko** es una plataforma digital que centraliza la oferta turística, gastronómica, cultural y de aventura de **Aguascalientes y sus Pueblos Mágicos**. Funciona como:

- Directorio geolocalizado de **Puntos de Interés (POIs)** con contacto directo (WhatsApp / llamada).
- **Motor de itinerarios** dinámicos y mixtos (rutas originales de Trekko + rutas comunitarias con créditos de autoría), con estimación de costo y duración.
- **Red social de turismo colaborativo**: Grupos Públicos, **Viaje Activo** en tiempo real (tolerancia, votación de rutas alternas).
- **Gamificación y reputación**: mapa de exploración, puntos, insignias, reseñas verificadas, karma entre viajeros.
- **Portal de Anfitriones** (prestadores de servicio) freemium, y **módulo de analítica anonimizada** para ayuntamientos.

El cliente es una app móvil **React Native (Expo)** con estrategia **Offline-First** (SQLite/WatermelonDB). **Este repositorio es solo el backend**: un **monolito modular NestJS** que expone API REST + gateway WebSocket sobre **PostgreSQL + PostGIS**.

### Objetivos del backend

1. Exponer una API REST versionada, segura, documentada (OpenAPI) y totalmente probada.
2. Implementar toda la lógica de negocio descrita en este documento en el servidor (**el cliente nunca es de confianza**).
3. Soportar clientes con conectividad intermitente (sincronización idempotente, validación de asistencia offline con código rotativo).
4. Ser desplegable con un único `docker compose up` (desarrollo) y en un VPS con proxy inverso + HTTPS (producción).
5. Tener **alta cobertura de pruebas** (unitarias, integración, e2e, WebSocket, concurrencia, seguridad).

### Fuera de alcance (ambas fases)

- Pasarela de pagos para **reservas dentro de la app**.
- Expansión a otros estados.
- Versión web de escritorio.

> **Nota:** el cobro de la **suscripción Premium** ($200 MXN/mes, comisión de pasarela ≈ 4 %) sí está dentro del alcance en Fase 2, pero detrás de una **abstracción de proveedor de pagos** (ver §7.9 y §18).

---

## 2. Alcance y fases

| Fase | Incluye | Hitos de esta spec |
|---|---|---|
| **Fase 1** | Cobertura de Aguascalientes + 4 Pueblos Mágicos, directorio de POIs con contacto directo, generador de itinerarios con costo y duración, autenticación segura con JWT | H0–H3 (+ endpoints de sincronización base de H4) |
| **Fase 2 (Evolución)** | Módulo social, grupos en tiempo real, gamificación, portal de prestadores (freemium), analítica anonimizada para ayuntamientos | H4–H9 |

**Regla:** implementar en orden de hitos. No iniciar un hito sin que el anterior cumpla su Definition of Done (§17). Los módulos de Fase 2 deben diseñarse de modo que no rompan el contrato de Fase 1.

---

## 3. Stack tecnológico y decisiones

| Aspecto | Decisión | Notas |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Fijar en `.nvmrc` y `engines` |
| Lenguaje | **TypeScript** con `strict: true` | Prohibido `any` implícito; `noUncheckedIndexedAccess` recomendado |
| Framework | **NestJS 10+** | Monolito modular; un módulo Nest por módulo de dominio |
| API | **REST** (`/api/v1`) + **WebSocket** | OpenAPI con `@nestjs/swagger` |
| WebSocket | `@nestjs/websockets` + **socket.io** (rooms) sobre WSS | Rooms por `viaje:{id}` |
| BD | **PostgreSQL 16 + PostGIS 3** | Imagen `postgis/postgis:16-3.4` |
| ORM | **TypeORM** + migraciones SQL versionadas | Consultas espaciales con `QueryBuilder`/SQL **parametrizado** (`$1`, `:param`); nunca concatenar strings |
| Validación | `class-validator` + `class-transformer` | `ValidationPipe` global: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` |
| Auth | `@nestjs/jwt`, `passport-jwt`, `bcrypt` | Access 15 min + refresh con rotación |
| Rate limiting | `@nestjs/throttler` | Más estricto en login/registro/reportes |
| Seguridad HTTP | `helmet`, CORS restringido por env | |
| Configuración | `@nestjs/config` + validación con `zod` (o `joi`) | Falla al arrancar si falta una variable |
| Logging | `nestjs-pino` (JSON estructurado) | Con `requestId`; **redactar** `authorization`, `password`, tokens |
| Archivos | Abstracción `StorageService` (S3-compatible) | **MinIO** en dev/test; cualquier S3/Supabase Storage en prod |
| Notificaciones | Abstracción `NotificationService` | Implementación Expo Push; `FakeNotificationService` en tests |
| Pagos | Abstracción `PaymentProvider` | Implementaciones: `MercadoPagoProvider`/`StripeProvider` (stubs configurables) + `FakePaymentProvider` |
| Tests | **Jest**, **supertest**, **Testcontainers** (PostGIS), `socket.io-client` | |
| Calidad | ESLint, Prettier, Husky + lint-staged, Commitlint (Conventional Commits) | |
| CI | GitHub Actions | lint → typecheck → unit → integration → e2e → build → audit |
| Contenedores | Docker multi-stage + `docker-compose.yml` (api, postgres/postgis, minio) | |
| Zona horaria | **UTC** en BD; lógica de horarios con `America/Mexico_City` | Librería: `luxon` o `date-fns-tz` |
| Reloj | Inyectar un `ClockService` (nunca llamar `Date.now()` directo en lógica de negocio) | Permite pruebas deterministas |
| IDs | **UUID v7** (o v4) generados por la app/BD | |

### Decisiones transversales

- **Nunca** acceso a BD desde el cliente. Flujo: `Controller (valida DTO) → Service (regla de negocio) → Repository (consulta)`.
- Los **controladores no contienen lógica**. Los **servicios no conocen HTTP**.
- Toda operación con múltiples escrituras usa **transacciones**.
- Los errores de dominio se lanzan como excepciones tipadas y un `ExceptionFilter` global las traduce a respuestas HTTP uniformes (§6).
- Parámetros de negocio (radios, umbrales, topes) viven en **configuración** (`config/business.config.ts`), no hardcodeados.

---

## 4. Arquitectura y estructura del repositorio

```
trekko-backend/
├── .github/
│   ├── workflows/ci.yml
│   └── copilot-instructions.md
├── docs/
│   ├── TREKKO_BACKEND_SPEC.md        # este documento
│   ├── ASSUMPTIONS.md                # decisiones tomadas ante ambigüedades
│   ├── ARCHITECTURE.md
│   └── openapi.json                  # exportado en CI
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/                       # env schema, business.config.ts
│   ├── common/
│   │   ├── decorators/               # @CurrentUser, @Roles, @Public
│   │   ├── guards/                   # JwtAuthGuard, RolesGuard, OwnershipGuard
│   │   ├── filters/                  # AllExceptionsFilter (RFC 7807)
│   │   ├── interceptors/             # logging, request-id, serialize
│   │   ├── pipes/
│   │   ├── dto/                      # PaginationDto, ProblemDetails
│   │   ├── errors/                   # DomainError y subclases + catálogo de códigos
│   │   ├── clock/                    # ClockService
│   │   ├── crypto/                   # CryptoService (AES-256-GCM, HMAC, hashing)
│   │   └── utils/                    # geo, time, pagination
│   ├── infra/
│   │   ├── database/                 # TypeORM config, migrations/, seeds/
│   │   ├── storage/                  # StorageService + S3 impl + Fake
│   │   ├── notifications/
│   │   └── payments/
│   └── modules/
│       ├── auth/                     # registro, login, refresh, logout
│       ├── users/                    # perfiles, roles/modos, verificación de identidad, contactos de confianza
│       ├── pois/                     # catálogo geolocalizado, eventos de métricas
│       ├── routes/                   # rutas, ruta_poi, ciclo de vida, itinerary generator
│       ├── sync/                     # push/pull offline
│       ├── checkins/
│       ├── reviews/                  # reseñas, ponderación, karma de comunidad
│       ├── groups/                   # grupos públicos, miembros, recurrentes, secreto de grupo
│       ├── trips/                    # viaje activo (REST + gateway WS), votaciones, máquina de estados
│       ├── gamification/             # puntos, insignias, mapa de exploración, ranking, canje QR
│       ├── safety/                   # reportes, sanciones, emergencias, share-links
│       ├── hosts/                    # negocios, reclamación, suscripción, promociones, estadísticas
│       ├── analytics/                # indicadores anonimizados
│       └── admin/                    # moderación y verificaciones manuales
├── test/
│   ├── e2e/                          # *.e2e-spec.ts por módulo
│   ├── integration/                  # *.int-spec.ts con Testcontainers
│   ├── security/                     # OWASP checks
│   ├── concurrency/
│   ├── ws/
│   ├── factories/                    # fábricas de datos de prueba
│   └── helpers/                      # bootstrap de app de pruebas, DB reset, tokens
├── docker/
│   ├── Dockerfile
│   └── nginx.conf (ejemplo de proxy inverso)
├── docker-compose.yml
├── docker-compose.test.yml
├── .env.example
├── jest.config.ts / jest.e2e.config.ts / jest.int.config.ts
└── README.md
```

### Estructura interna de cada módulo

```
modules/<nombre>/
├── <nombre>.module.ts
├── <nombre>.controller.ts
├── <nombre>.service.ts
├── <nombre>.repository.ts       # opcional si se usa repositorio TypeORM directo con consultas complejas
├── entities/
├── dto/                         # request/response DTOs (con decoradores swagger + class-validator)
├── mappers/
├── <nombre>.gateway.ts          # solo si aplica (trips)
├── errors/
└── __tests__/ (o *.spec.ts junto al archivo)
```

---

## 5. Modelo de datos

**Convenciones:** tablas en `snake_case` singular en español como en el documento del proyecto; columnas `id uuid PK`, `creado_en timestamptz NOT NULL DEFAULT now()`, `actualizado_en timestamptz NOT NULL DEFAULT now()`; **borrado lógico** (`eliminado_en timestamptz NULL`) en entidades sincronizables con el cliente (poi, ruta, grupo, resena, check_in). Todas las geometrías: `geometry(Point, 4326)` con índice **GIST**.

Extensiones requeridas: `postgis`, `pgcrypto` (o generar UUID en app), `citext` (correo insensible a mayúsculas), `pg_trgm` (búsqueda por nombre).

### 5.1 Identidad y acceso

**`usuario`**
| Campo | Tipo | Restricciones |
|---|---|---|
| id | uuid | PK |
| nombre | varchar(100) | NOT NULL |
| correo | citext | UNIQUE NOT NULL |
| hash_password | varchar | NULL si solo social |
| modo_activo | enum(`explorador`,`creador`,`anfitrion`) | DEFAULT `explorador` |
| reputacion | integer | DEFAULT 0, CHECK ≥ 0 |
| puntos_saldo | integer | DEFAULT 0, CHECK ≥ 0 |
| perfil_verificado | boolean | DEFAULT false |
| estado | enum(`activo`,`restringido`,`bloqueado`,`eliminado`) | DEFAULT `activo` |
| restringido_hasta | timestamptz | NULL |
| intentos_fallidos | smallint | DEFAULT 0 |
| bloqueado_login_hasta | timestamptz | NULL |
| foto_url | varchar | NULL |
| fecha_registro | timestamptz | NOT NULL |

**`usuario_rol`** — un usuario puede tener varios roles: `usuario_id`, `rol` enum(`explorador`,`creador`,`anfitrion`,`entidad`,`admin`), PK compuesta. Todo usuario nuevo recibe `explorador`.

**`refresh_token`**: `id`, `usuario_id`, `familia_id uuid`, `token_hash` (SHA-256, nunca el token en claro), `expira_en`, `revocado_en`, `reemplazado_por uuid`, `dispositivo` (varchar), `ip`, `creado_en`. Índices en `token_hash` (único) y `familia_id`.

**`verificacion_identidad`**: `id`, `usuario_id`, `tipo_documento` enum(`ine`,`pasaporte`,`cedula`), `archivo_clave_cifrada` (referencia al objeto cifrado), `estado` enum(`pendiente`,`aprobada`,`rechazada`,`expirada`), `revisado_por`, `motivo_rechazo`, `eliminar_archivo_en`, `creado_en`.

**`contacto_confianza`**: `id`, `usuario_id`, `nombre`, `telefono_cifrado`, `creado_en`. Máximo 5 por usuario.

### 5.2 Catálogo

**`negocio`**: `id`, `nombre`, `descripcion`, `propietario_id` (FK usuario, NULL hasta que se reclame), `estado_reclamo` enum(`sin_reclamar`,`pendiente`,`verificado`), `contacto_whatsapp`, `contacto_telefono`, `sitio_web`, `creado_en`.

**`poi`**
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| nombre | varchar(150) | NOT NULL, índice trigram |
| descripcion | text | |
| categoria | enum(`restaurante`,`hospedaje`,`artesania`,`aventura`,`cultural`,`naturaleza`,`transporte`,`otro`) | NOT NULL |
| municipio_id | uuid FK `municipio` | NOT NULL |
| ubicacion | geometry(Point,4326) | NOT NULL, GIST |
| direccion | varchar | |
| costo_promedio | numeric(10,2) | NOT NULL DEFAULT 0, CHECK ≥ 0 |
| horario | jsonb | Esquema en §8.9 |
| contacto | jsonb | `{whatsapp?, telefono?, sitio?}` |
| duracion_visita_min | smallint | Duración típica sugerida |
| negocio_id | uuid FK NULL | |
| calificacion_promedio | numeric(3,2) | Desnormalizado (recalculado al reseñar) |
| numero_resenas | integer | Desnormalizado |
| destacado_hasta | timestamptz | Posicionamiento Premium |
| fotos | text[] | Claves de objeto |
| eliminado_en | timestamptz | Tombstone |

**`municipio`**: `id`, `nombre`, `es_pueblo_magico boolean`, `geom_limite geometry(MultiPolygon,4326)` (opcional), `centro geometry(Point,4326)`.

**`poi_evento_metrica`**: `id`, `poi_id`, `tipo` enum(`vista`,`contacto_whatsapp`,`contacto_llamada`,`guardado`), `usuario_id NULL`, `creado_en`. Sirve a estadísticas del Anfitrión.

### 5.3 Rutas e itinerarios

**`ruta`**: `id`, `autor_id` (FK usuario; NULL o usuario sistema para rutas Trekko Originals), `tipo` enum(`original`,`comunitaria`), `estado` enum(`borrador`,`validada`,`publicada`,`archivada`), `titulo`, `descripcion`, `costo_estimado numeric(10,2)`, `duracion_min integer`, `municipio_id`, `veces_usada integer DEFAULT 0`, `veces_guardada integer DEFAULT 0`, `ruta_origen_id NULL` (si es copia/adaptación, para créditos), `eliminado_en`.

**`ruta_poi`**: `ruta_id`, `poi_id`, `orden smallint`, `duracion_visita_min smallint`. PK `(ruta_id, orden)` y UNIQUE `(ruta_id, poi_id)`.

**`ruta_guardada`**: `usuario_id`, `ruta_id`, `creado_en` (PK compuesta).

### 5.4 Social y viaje

**`grupo`**: `id`, `ruta_id`, `organizador_id`, `titulo`, `descripcion`, `destino_texto`, `cupo smallint` (CHECK 2..50), `miembros_count smallint`, `fecha_inicio timestamptz`, `duracion_min`, `punto_encuentro geometry(Point,4326)`, `punto_encuentro_nombre`, `tolerancia_min smallint DEFAULT 10`, `estado` enum(`abierto`,`lleno`,`cerrado`,`cancelado`,`finalizado`), `secreto_cifrado bytea`, `recurrente boolean DEFAULT false`, `recurrencia jsonb NULL` (`{dias:[2,4], hora:"19:00", zona:"America/Mexico_City"}`), `comunidad_verificada boolean`, `eliminado_en`.

**`grupo_miembro`**: `grupo_id`, `usuario_id`, `estado` enum(`activo`,`retirado`,`expulsado`), `rol` enum(`organizador`,`miembro`), `unido_en`. **PK compuesta `(grupo_id, usuario_id)`** (llave única — idempotencia).

**`viaje_activo`**: `id`, `grupo_id`, `estado` enum(`programado`,`en_espera`,`activo`,`en_votacion`,`finalizado`,`resenado`,`cancelado`), `evento_actual smallint NULL` (índice de `ruta_poi.orden`), `hora_inicio_programada`, `hora_inicio_real`, `tolerancia_vence_en`, `finalizado_en`, `version integer` (control optimista).

**`viaje_asistencia`**: `viaje_id`, `usuario_id`, `llegada_en`, `origen` enum(`online`,`offline_codigo`), `ubicacion geometry`, `operacion_id uuid UNIQUE`, `estado_validacion` enum(`valida`,`rechazada`), `motivo_rechazo`.

**`votacion`**: `id`, `viaje_id`, `evento_orden`, `tipo` enum(`omitir_evento`,`ruta_alterna`), `opciones jsonb` (p. ej. `["omitir","mantener"]` o POI alternativo), `abre_en`, `cierra_en`, `estado` enum(`abierta`,`cerrada`), `resultado jsonb`.

**`voto`**: `votacion_id`, `usuario_id`, `opcion`, `operacion_id UNIQUE NULL`, `creado_en`. PK `(votacion_id, usuario_id)`.

### 5.5 Reputación, check-in y reseñas

**`check_in`**: `id`, `usuario_id`, `poi_id`, `ubicacion geometry`, `precision_m numeric`, `distancia_a_poi_m numeric`, `viaje_id NULL`, `origen` enum(`online`,`offline`), `operacion_id uuid UNIQUE NULL`, `fecha timestamptz` (la del evento, no la de sincronización), `creado_en`.
Índice: `(usuario_id, poi_id, fecha DESC)`.

**`resena`**: `id`, `usuario_id`, `poi_id`, `check_in_id UNIQUE NOT NULL` (una reseña por check-in), `viaje_id NULL`, `calif_precio`, `calif_servicio`, `calif_accesibilidad`, `calif_facilidad_llegar` (todas smallint 1..5), `calificacion_global numeric(3,2)` (calculada), `texto text (≤ 2000)`, `fotos text[]`, `peso numeric(4,2)` (peso por reputación al crearla), `operacion_id UNIQUE NULL`, `eliminado_en`.

**`calificacion_entre_viajeros`** (karma): `id`, `viaje_id`, `evaluador_id`, `evaluado_id`, `puntualidad`, `respeto`, `convivencia` (1..5), `etiquetas text[]`. UNIQUE `(viaje_id, evaluador_id, evaluado_id)`; CHECK `evaluador_id <> evaluado_id`.

### 5.6 Gamificación

**`puntos_movimiento`** (libro mayor): `id`, `usuario_id`, `accion` enum(`checkin`,`resena`,`resena_foto`,`publicar_ruta`,`ruta_usada`,`municipio_nuevo`,`canje`,`ajuste`), `puntos integer` (negativo en canjes), `referencia_tipo`, `referencia_id`, `dia date`, `creado_en`. UNIQUE parcial para evitar duplicar puntos por la misma referencia/acción.

**`insignia`**: `id`, `codigo UNIQUE`, `nombre`, `descripcion`, `requisito jsonb` (regla declarativa), `patrocinador_negocio_id NULL`, `icono`.
**`usuario_insignia`**: `usuario_id`, `insignia_id`, `fecha` (PK compuesta).
**`municipio_explorado`**: `usuario_id`, `municipio_id`, `primera_visita`, `visitas` (PK compuesta).

**`recompensa`**: `id`, `negocio_id`, `titulo`, `descripcion`, `costo_puntos`, `tope_mensual_por_usuario smallint`, `stock NULL`, `activa`, `vigente_hasta`.
**`canje`**: `id`, `usuario_id`, `recompensa_id`, `token_hash`, `expira_en`, `estado` enum(`generado`,`validado`,`expirado`,`cancelado`), `validado_por`, `validado_en`.

### 5.7 Seguridad social

**`reporte`**: `id`, `reportante_id`, `reportado_id`, `viaje_id NULL`, `grupo_id NULL`, `motivo` enum(`acoso`,`conducta_inapropiada`,`violencia`,`fraude`,`otro`), `detalle`, `estado` enum(`abierto`,`en_revision`,`confirmado`,`descartado`), `creado_en`. UNIQUE `(reportante_id, reportado_id, viaje_id)` para evitar spam de reportes.
**`sancion`**: `id`, `usuario_id`, `tipo` enum(`advertencia`,`restriccion_temporal`,`bloqueo`), `inicia_en`, `termina_en NULL`, `origen_reporte_ids uuid[]`, `aplicada_por` (`sistema`/admin id).
**`enlace_compartido`**: `id`, `usuario_id`, `viaje_id`, `token_hash`, `expira_en`, `revocado_en`.

### 5.8 Anfitriones y monetización

**`suscripcion`**: `id`, `negocio_id`, `plan` enum(`gratuito`,`premium`), `estado` enum(`activa`,`vencida`,`cancelada`,`pendiente_pago`), `vigente_desde`, `vigente_hasta`, `proveedor`, `proveedor_ref`, `monto_bruto numeric`, `comision numeric`, `monto_neto numeric`.
**`pago_evento_webhook`**: `id`, `proveedor`, `evento_id UNIQUE` (idempotencia), `payload jsonb`, `procesado_en`.
**`promocion`**: `id`, `negocio_id`, `poi_id NULL`, `titulo`, `descripcion`, `inicia_en`, `termina_en`, `activa`.

### 5.9 Auditoría

**`auditoria`**: `id`, `actor_id`, `accion`, `entidad`, `entidad_id`, `meta jsonb`, `ip`, `creado_en`. Se escribe en: cambios de rol, sanciones, verificación de identidad, canje validado, reclamo de negocio, cambios de suscripción, borrado de cuenta.

### 5.10 Índices mínimos obligatorios

- `poi`: GIST(`ubicacion`), BTREE(`categoria`, `municipio_id`), GIN trigram(`nombre`), BTREE(`actualizado_en`) para sync.
- `check_in`: `(usuario_id, poi_id, fecha DESC)`; GIST(`ubicacion`).
- `grupo`: `(estado, fecha_inicio)`, GIST(`punto_encuentro`).
- `refresh_token`: `token_hash` único, `familia_id`.
- `voto`, `grupo_miembro`: PK compuestas.
- Todas las FK indexadas.

---

## 6. Convenciones de API

- **Prefijo y versión:** `/api/v1`. Swagger UI en `/api/docs` (deshabilitado en producción salvo flag).
- **Formato:** JSON, `camelCase` en payloads. Fechas ISO-8601 UTC. Dinero como string decimal con 2 decimales o número con 2 decimales (elegir uno y mantenerlo; recomendado **number con 2 decimales** + moneda `MXN` implícita).
- **Autenticación:** `Authorization: Bearer <accessToken>`. Rutas públicas marcadas con `@Public()`.
- **Paginación:** `?page=1&limit=20` (máx. `limit=100`) → respuesta `{ data: [], meta: { page, limit, total, totalPages } }`. Para sync, paginación por **cursor**.
- **Errores (RFC 7807 `application/problem+json`):**

```json
{
  "type": "https://trekko.app/errors/group-full",
  "title": "El grupo está lleno",
  "status": 409,
  "code": "GROUP_FULL",
  "detail": "No hay cupo disponible en este grupo.",
  "instance": "/api/v1/groups/9f1c.../join",
  "requestId": "b3f2...",
  "errors": [{ "field": "email", "message": "..." }]
}
```

- **Catálogo de códigos de error** (mínimo): `VALIDATION_ERROR`, `UNAUTHORIZED`, `TOKEN_EXPIRED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INVALID_CREDENTIALS`, `EMAIL_IN_USE`, `RATE_LIMITED`, `GROUP_FULL`, `ALREADY_MEMBER`, `INVALID_STATE_TRANSITION`, `CHECKIN_TOO_FAR`, `CHECKIN_REQUIRED`, `REVIEW_ALREADY_EXISTS`, `REVIEW_WINDOW_EXPIRED`, `INVALID_ATTENDANCE_CODE`, `DUPLICATE_OPERATION`, `ACCOUNT_RESTRICTED`, `ACCOUNT_LOCKED`, `INSUFFICIENT_POINTS`, `REWARD_CAP_REACHED`, `QR_EXPIRED`, `PAYMENT_SIGNATURE_INVALID`.
- **Seguridad de mensajes:** `INVALID_CREDENTIALS` **no** revela si falló correo o contraseña. El registro con correo existente devuelve `EMAIL_IN_USE` (aceptado por UX; mitigado con rate limiting).
- **Idempotencia:** `POST` que crean recursos con riesgo de doble envío aceptan header `Idempotency-Key` (opcional) además de las llaves únicas de BD.
- **Health:** `GET /health` (liveness) y `GET /health/ready` (BD + storage).
- **Headers de respuesta:** `X-Request-Id` en todas.
- **Límites de payload:** JSON 1 MB; imágenes 5 MB máx., tipos `image/jpeg|png|webp` verificados por **magic bytes**, no solo por extensión.

---

## 7. Módulos y endpoints

> Leyenda de acceso: 🔓 público · 🔐 autenticado · 👤 Explorador · ✍️ Creador · 🏪 Anfitrión · 🏛️ Entidad · 🛡️ Admin.
> **Todo endpoint** valida DTOs, aplica guards y devuelve errores según §6. Cada endpoint debe tener decoradores Swagger (`@ApiOperation`, `@ApiResponse` incluyendo errores).

### 7.1 `auth` (Fase 1)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/auth/register` | 🔓 | Body `{nombre, correo, password}`. Valida correo único, password ≥ 8 (letras + número recomendado), hash **bcrypt** (cost configurable, default 12, mínimo 10). Crea usuario con rol `explorador`. Devuelve `{accessToken, refreshToken, user}`. |
| POST | `/auth/login` | 🔓 | Body `{correo, password}`. Rate limit estricto. Contador de intentos fallidos → bloqueo temporal (default 5 intentos → 15 min, `ACCOUNT_LOCKED`). Mensaje genérico en fallo. |
| POST | `/auth/refresh` | 🔓 | Body `{refreshToken}`. **Rotación**: invalida el usado, emite uno nuevo en la misma `familia_id`. **Detección de reutilización**: si llega un refresh ya rotado → revocar toda la familia (`UNAUTHORIZED`). |
| POST | `/auth/logout` | 🔐 | Revoca el refresh actual (o toda la familia con `?all=true`). |
| POST | `/auth/social` | 🔓 | *(Opcional, hito H9)* Intercambia ID token de Google/Apple por sesión Trekko. Interfaz `SocialIdentityVerifier` con Fake para pruebas. |
| GET | `/auth/me` | 🔐 | Usuario actual. |

**Detalles:** JWT access con claims mínimos `{sub, roles, modoActivo, jti}`; expira en **15 min**. Refresh opaco aleatorio (≥ 256 bits) almacenado **solo como hash**; expira en 30 días. Secretos distintos para access y firma de otros tokens. Algoritmo fijo (`HS256` o `RS256`), rechazar `alg: none`.

### 7.2 `users` (Fase 1 básico, Fase 2 completo)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/users/me` | 🔐 | Perfil propio completo (incluye roles, modo activo, reputación, puntos, insignias, resumen de karma). |
| PATCH | `/users/me` | 🔐 | Edita nombre y foto. Campos sensibles (rol, reputación, correo) **no** editables aquí (whitelist). |
| PATCH | `/users/me/modo` | 🔐 | Cambia `modo_activo`; solo a modos que el usuario posee. |
| GET | `/users/:id/public` | 🔐 | Perfil público: nombre, foto, insignias, salidas completadas, calificación promedio entre viajeros, `perfilVerificado`. Nunca correo ni ubicación. |
| DELETE | `/users/me` | 🔐 | Eliminación/anonimización de cuenta (§12). |
| POST | `/users/me/verification` | 🔐 | Multipart: documento (INE/pasaporte/cédula). Cifra y guarda; estado `pendiente`. |
| GET | `/users/me/verification` | 🔐 | Estado de verificación. |
| GET/POST/DELETE | `/users/me/trusted-contacts` | 🔐 | CRUD de contactos de confianza (máx. 5, teléfono cifrado). |

**Promoción automática a Creador:** al registrar un check-in verificado o una reseña, un listener evalúa si el usuario alcanzó ≥ `CREATOR_MIN_CHECKINS` (5) **y** ≥ `CREATOR_MIN_REVIEWS` (3); si es así, agrega rol `creador` (idempotente) y emite evento `user.role.granted`.

### 7.3 `pois` (Fase 1)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/pois` | 🔓/🔐 | Lista filtrable y paginada: `q` (búsqueda trigram), `categoria[]`, `municipioId`, `costoMin`, `costoMax`, `abiertoAhora=true`, `ordenar=distancia\|calificacion\|costo`, `lat`, `lng`. |
| GET | `/pois/nearby` | 🔓/🔐 | `lat`, `lng`, `radioM` (default 5000, máx. 50000), filtros anteriores. **PostGIS** `ST_DWithin(ubicacion::geography, ST_SetSRID(ST_MakePoint($lng,$lat),4326)::geography, $radio)` + `ST_Distance` ordenado. Devuelve `distanciaM`. Los POIs con `destacado_hasta > now()` se priorizan dentro de empates configurables, **marcados como `destacado:true`** (transparencia). |
| GET | `/pois/:id` | 🔓/🔐 | Detalle: datos, contacto (con enlaces `wa.me` y `tel:` generados), horario, calificación (ponderada + `numeroResenas`), promociones activas, fotos. Registra métrica `vista` (asíncrono, sin bloquear). |
| POST | `/pois/:id/events` | 🔐/🔓 | `{tipo: 'contacto_whatsapp'\|'contacto_llamada'\|'guardado'}` para estadísticas. Rate limited. |
| POST | `/pois` | 🛡️ / 🏪 propietario | Crear POI (Admin libre; Anfitrión solo vinculado a su negocio). |
| PATCH | `/pois/:id` | 🛡️ / 🏪 dueño | Editar. **OwnershipGuard**: solo el propietario del negocio. |
| DELETE | `/pois/:id` | 🛡️ | Borrado lógico (tombstone para sync). |
| POST | `/pois/:id/photos` | 🛡️ / 🏪 dueño | Subida de fotos (validación de tipo/tamaño por magic bytes). |
| GET | `/municipios` | 🔓 | Lista (marca Pueblos Mágicos). |

### 7.4 `routes` e itinerarios (Fase 1 generador; Fase 2 comunitarias)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/routes` | 🔓/🔐 | Rutas `publicada` filtrables por `tipo`, `municipioId`, costo, duración; incluyen **créditos de autoría** (`autor: {id,nombre}`; para originales `"Trekko"`). |
| GET | `/routes/:id` | 🔓/🔐 | Detalle con POIs ordenados, costo, duración, créditos. |
| POST | `/routes/generate` | 🔐 👤 | **Generador de itinerarios** (CU-04). Ver §8.1. No persiste; devuelve propuesta con `costoEstimado`, `duracionMin`, `advertencias[]`. |
| POST | `/routes` | 🔐 ✍️ (🛡️ para originales) | Crea ruta en `borrador` (CU-05). Valida existencia de POIs y orden. Calcula costo/duración con PostGIS. |
| PATCH | `/routes/:id` | dueño | Edita mientras `borrador`/`validada`; editar una `publicada` la regresa a `borrador` (versionado simple). |
| POST | `/routes/:id/validate` | dueño | Verifica horarios, distancias razonables entre POIs consecutivos, campos obligatorios → `validada`. Devuelve lista de errores si no pasa. |
| POST | `/routes/:id/publish` | dueño | `validada → publicada`. Otorga puntos (§8.7). |
| POST | `/routes/:id/archive` | dueño/🛡️ | `→ archivada`. |
| POST | `/routes/:id/copy` | 🔐 | Copia como `borrador` propio conservando `ruta_origen_id` (créditos al autor original) y suma `veces_usada` + puntos al autor original. |
| POST/DELETE | `/routes/:id/save` | 🔐 | Guardar/quitar de guardados. |

**Rutas Trekko Originals:** `tipo = original`, creadas solo por Admin (o seed), autor mostrado como "Trekko".

### 7.5 `sync`, `checkins` y `reviews` (H4)

Detalle de sincronización en §10.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/checkins` | 🔐 | Check-in en línea `{poiId, lat, lng, precisionM, viajeId?}`. Reglas §8.3. |
| GET | `/checkins/me` | 🔐 | Historial propio paginado. |
| POST | `/reviews` | 🔐 | `{checkInId, califPrecio, califServicio, califAccesibilidad, califFacilidadLlegar, texto?, fotos?}`. Exige check-in propio verificado, sin reseña previa y dentro de la ventana. Recalcula agregados del POI **en la misma transacción**. |
| GET | `/pois/:id/reviews` | 🔓/🔐 | Lista paginada, ordenable (`recientes`, `utiles`). |
| PATCH/DELETE | `/reviews/:id` | autor | Edición dentro de 48 h (recalcula); borrado lógico (recalcula). |
| POST | `/reviews/:id/photos` | autor | Subir fotos. |
| POST | `/sync/push` | 🔐 | Lote de operaciones offline (§10). |
| GET | `/sync/pull` | 🔐 | Cambios desde un cursor (§10). |

### 7.6 `groups` (H5)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/groups` | 🔐 | Grupos públicos `abierto` futuros; filtros `destino`, `municipioId`, `fechaDesde/Hasta`, `cupoDisponible`, `cerca(lat,lng,radio)`. |
| POST | `/groups` | 🔐 (no restringido) | **Publicar Grupo Público** (CU-06): `{rutaId, titulo, descripcion, cupo, fechaInicio, duracionMin, puntoEncuentro{lat,lng,nombre}, toleranciaMin, recurrente?, recurrencia?}`. El organizador define cupo, destino, duración e itinerario. Genera **secreto de grupo** (32 bytes aleatorios, cifrado AES-GCM en BD). El organizador queda como miembro. |
| GET | `/groups/:id` | 🔐 | Detalle: miembros (con perfil público/karma), cupo restante, ruta, punto de encuentro. |
| PATCH | `/groups/:id` | organizador | Editar mientras `abierto`/`lleno` y no iniciado. Reducir cupo por debajo de miembros actuales → error. |
| POST | `/groups/:id/join` | 🔐 | **Unirse** (CU-07). Transaccional, idempotente (§8.2). |
| POST | `/groups/:id/leave` | miembro | Salir (libera cupo; reabre si estaba `lleno`). El organizador no puede salir sin transferir/cancelar. |
| POST | `/groups/:id/kick/:userId` | organizador | Expulsar. |
| POST | `/groups/:id/cancel` | organizador | Cancela grupo y viaje programado; notifica miembros. |
| GET | `/groups/:id/secret` | miembro activo | Entrega el **secreto de grupo** para uso offline (§8.4). Auditado. Solo mientras el viaje no esté finalizado. |
| GET | `/groups/me` | 🔐 | Grupos del usuario (pasados y futuros). |

**Grupos recurrentes:** `recurrencia` define días/hora; un job (`@nestjs/schedule`) genera la siguiente **instancia de viaje** (`viaje_activo` en `programado`) con antelación configurable, sin recrear el grupo. Los miembros permanentes se mantienen.

### 7.7 `trips` — Viaje Activo (H6)

REST complementario (la sincronización en vivo es por WebSocket, §9):

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/groups/:id/trips` | organizador | Programa un viaje para el grupo (crea `viaje_activo` en `programado`). |
| GET | `/trips/:id` | miembro | Estado completo (estado, evento actual, asistentes, votaciones abiertas). Útil para reconexión. |
| POST | `/trips/:id/start` | organizador | `programado → en_espera`; inicia temporizador de tolerancia; notifica. |
| POST | `/trips/:id/arrive` | miembro | Confirma llegada en línea (check-in con ubicación ≤ radio del punto de encuentro). |
| POST | `/trips/:id/attendance` | organizador/miembro | Registro de asistencia con **código rotativo** (en línea). |
| POST | `/trips/:id/votes` | organizador / sistema | Abre votación (omitir evento o ruta alterna). |
| POST | `/trips/:id/votes/:votacionId/cast` | miembro presente | Emite voto. |
| POST | `/trips/:id/advance` | organizador | Avanza manualmente (modo sin conexión / decisión del líder). |
| POST | `/trips/:id/finish` | organizador | `→ finalizado`; abre reseñas y calificación entre viajeros. |
| POST | `/trips/:id/cancel` | organizador | Desde `programado`/`en_espera`. |
| POST | `/trips/:id/peer-ratings` | miembro | Calificar a otros integrantes (karma, §8.8). |
| POST | `/trips/:id/share-link` | miembro | Crea enlace temporal de solo lectura (ubicación + itinerario) para contactos de confianza. |
| GET | `/share/:token` | 🔓 | Vista de solo lectura del enlace compartido (sin datos sensibles extra). |

### 7.8 `gamification` (H7)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/gamification/me` | 🔐 | Puntos, nivel, insignias, municipios explorados, progreso a siguientes insignias. |
| GET | `/gamification/map` | 🔐 | **Mapa de exploración**: GeoJSON de municipios explorados + check-ins (puntos) del usuario. |
| GET | `/gamification/ranking` | 🔐 | Ranking por periodo (`mensual`,`global`) y alcance (`municipio`). Paginado; solo datos públicos. |
| GET | `/gamification/badges` | 🔐 | Catálogo de insignias. |
| GET | `/rewards` | 🔐 | Recompensas disponibles de comercios participantes. |
| POST | `/rewards/:id/redeem` | 🔐 | Genera **canje** con token/QR de un solo uso (§8.7). Descuenta puntos de forma atómica. |
| POST | `/rewards/redeem/validate` | 🏪 | El comercio valida el QR; marca `validado` (idempotente: segundo intento → error). |
| POST/PATCH | `/hosts/rewards` | 🏪 | El comercio define oferta y costo en puntos. |

### 7.9 `hosts` — Portal de Anfitriones y suscripciones (H8)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/hosts/businesses/:id/claim` | 🔐 | Solicita reclamar un negocio → `pendiente`; adjunta evidencia. |
| POST | `/admin/businesses/:id/verify` | 🛡️ | Aprueba/rechaza reclamo → rol `anfitrion` al usuario (auditado). |
| GET/PATCH | `/hosts/businesses/mine` | 🏪 | Gestiona fichas propias (OwnershipGuard). |
| GET | `/hosts/businesses/:id/stats` | 🏪 dueño | Vistas, contactos (WhatsApp/llamada), reseñas, calificación; rango de fechas. Algunas métricas avanzadas solo con **Premium**. |
| CRUD | `/hosts/promotions` | 🏪 dueño (Premium) | Promociones destacadas. |
| GET | `/hosts/subscription` | 🏪 | Plan vigente. |
| POST | `/hosts/subscription/checkout` | 🏪 | Crea intento de pago Premium ($200 MXN/mes) vía `PaymentProvider`. |
| POST | `/webhooks/payments/:provider` | 🔓 (firma) | Webhook: **verifica firma**, idempotente por `evento_id`, actualiza suscripción, calcula `comision` (4 %) y `monto_neto`. Firma inválida → 400/401 sin procesar. |
| — | job | sistema | Marca `vencida` suscripciones al pasar `vigente_hasta`; quita `destacado_hasta`. |

### 7.10 `safety` (H7)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/reports` | 🔐 | Reporte rápido (un toque) de acoso/conducta. Rate limited. UNIQUE por reportante-reportado-viaje. Dispara evaluación de sanciones (§8.8). |
| GET | `/safety/emergency` | 🔓 | Números: 911, Ángeles Verdes (078), Protección Civil (configurable por env/DB). |
| GET | `/safety/meeting-points` | 🔐 | Sugerencias de puntos de encuentro seguros (POIs marcados `punto_seguro` o comercios aliados) cerca de una coordenada. |
| GET/PATCH | `/admin/reports` | 🛡️ | Revisión: `confirmado`/`descartado`, aplicar/revocar sanciones. |

### 7.11 `analytics` (H8)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/analytics/overview` | 🏛️ | Indicadores agregados por municipio y rango de fechas: visitas por municipio, check-ins por categoría, rutas más usadas, estacionalidad, gasto promedio estimado. |
| GET | `/analytics/heatmap` | 🏛️ | Agregación geográfica por municipio/celda (grid ≥ 500 m). |

**Reglas de anonimización (obligatorias):** sin `usuario_id` ni identificadores directos; **k-anonimato mínimo k=5** (celdas/categorías con < 5 registros se suprimen o agrupan como "otros"); sin trayectorias individuales. Requiere rol `entidad`.

### 7.12 `admin`

Moderación de verificaciones de identidad (`/admin/verifications`), reportes, sanciones, reclamos de negocio, gestión de insignias, usuarios (cambiar estado, otorgar rol `entidad`). Todo auditado.

---

## 8. Reglas de negocio críticas

### 8.1 Generador de itinerarios (`POST /routes/generate`)

**Entrada:** `{ municipioId | centro{lat,lng,radioM}, fecha, horaInicio, horaFin | duracionMaxMin, presupuestoMax?, personas (1..20), categorias[], ritmo ('relajado'|'normal'|'intenso'), puntoInicio?{lat,lng}, excluirPoiIds? }`

**Algoritmo (determinista y testeable):**

1. Candidatos = POIs no eliminados dentro del área, de las categorías pedidas.
2. Puntuar: `score = w1*categoriaMatch + w2*calificacionPonderada + w3*cercaniaAlInicio − w4*penalizacionCosto`. Pesos en `business.config`.
3. Construir la secuencia con heurística **vecino más cercano** respetando:
   - ventana horaria y **horario de cada POI** (no programar un POI cerrado en esa hora);
   - tiempo de traslado estimado = `distancia_haversine × 1.3 / velocidad_promedio` (30 km/h urbano, 50 km/h carretera; configurable). **No depender de APIs externas.**
   - duración de visita = `poi.duracion_visita_min` ajustada por `ritmo` (relajado ×1.25, intenso ×0.8);
   - comidas: si el rango cubre 13:00–15:00, intentar incluir un `restaurante`.
4. Costo = `Σ costo_promedio × personas` (considerando POIs de costo por persona) + estimado de transporte. Si excede `presupuestoMax`, quitar POIs de menor score y reportar `advertencias`.
5. **Salida:** `{ items: [{poiId, orden, horaLlegada, horaSalida, duracionVisitaMin, traslado{distanciaM, minutos}, costo}], costoTotal, costoPorPersona, duracionTotalMin, advertencias[] , desglose{entradas, comida, hospedaje, transporte} }`.
6. Mismo input → mismo output (sin aleatoriedad; desempates por `id`).

### 8.2 Cupos y unirse a un grupo (concurrencia)

- `join` ejecuta en **una transacción**: bloquear la fila del grupo (`SELECT ... FOR UPDATE`) **o** `UPDATE grupo SET miembros_count = miembros_count + 1 WHERE id = $1 AND miembros_count < cupo AND estado='abierto' RETURNING ...`; si no afecta filas → `GROUP_FULL`.
- Insert en `grupo_miembro` con PK `(grupo_id, usuario_id)`; si ya existe y está `activo` → respuesta **idempotente** (200 con el estado actual, o 409 `ALREADY_MEMBER` — elegir una y documentarla; recomendado 200 idempotente).
- Al llegar a `cupo` → `estado = 'lleno'`. Al salir alguien → `abierto`.
- Usuarios `restringido`/`bloqueado` no pueden crear ni unirse (`ACCOUNT_RESTRICTED`).
- **Prueba obligatoria:** con 1 cupo restante, 20 `join` concurrentes de usuarios distintos → exactamente 1 éxito.

### 8.3 Check-in verificado por geolocalización

- Parámetros configurables: `CHECKIN_RADIUS_M=150`, `CHECKIN_MAX_ACCURACY_M=100`, `CHECKIN_COOLDOWN_HOURS=12` (por usuario+POI).
- Validar: `precisionM ≤ max`; `ST_Distance(posición, poi.ubicacion) ≤ radio`. Si no → `CHECKIN_TOO_FAR` (con `distanciaM` en el error).
- Check-in con `fecha` del cliente (offline): aceptar solo si no es futura (> 5 min de tolerancia de reloj) y no es anterior a `CHECKIN_MAX_AGE_DAYS` (7).
- Guardar `distancia_a_poi_m` para auditoría.
- Eventos emitidos: `checkin.created` → gamificación (puntos, municipio nuevo, insignias) y promoción a Creador.

### 8.4 Validación de asistencia offline con código rotativo (zonas sin señal)

**Objetivo:** permitir marcar asistencia sin conexión y que el servidor la valide después, de modo que un código compartido por fuera **no baste** sin estar físicamente presente.

1. **Secreto de grupo:** al crear el grupo se genera `secreto` (32 bytes CSPRNG), se guarda cifrado. Los miembros lo descargan (`GET /groups/:id/secret`) antes de salir.
2. **Código:** `codigo = TOTP-like`: `HMAC-SHA256(secreto_derivado, floor(t / PASO))` → *dynamic truncation* → 6 dígitos con ceros a la izquierda. `PASO = ATTENDANCE_CODE_STEP_S` (default **180 s**). `secreto_derivado = HKDF(secreto, info = viajeId)`.
3. **Cliente:** muestra el código; el líder lo comparte; los integrantes lo ingresan y se guarda un registro local `{operacionId (UUID), viajeId, codigo, timestampCliente, lat, lng, precisionM, dispositivoId}`.
4. **Servidor (al sincronizar o en línea):** para cada registro:
   - **Idempotencia:** `operacion_id` único → duplicado ⇒ `status: "duplicate"` (no error, no efectos).
   - Usuario es miembro activo del grupo.
   - `timestampCliente` dentro de `[hora_inicio_programada − tolerancia − margen, hora_inicio_programada + tolerancia + margen]` y no futuro (> 5 min).
   - Código válido para el paso de `timestampCliente` con **ventana ±1 paso**.
   - Ubicación registrada a ≤ `MEETING_POINT_RADIUS_M` (default 100 m) del punto de encuentro (con `precisionM` aceptable).
   - Si algo falla → registro **rechazado** con `motivo` (`CODE_INVALID`, `OUT_OF_WINDOW`, `TOO_FAR`, `NOT_MEMBER`), persistido en `viaje_asistencia` con `estado_validacion = rechazada`.
5. **Riesgo aceptado y documentado:** quien tiene el secreto puede calcular el código; la **verificación de ubicación y ventana temporal** en el servidor es la barrera principal.

> Implementar `AttendanceCodeService.generate(secret, viajeId, timestamp)` y `.verify(secret, viajeId, code, timestamp, window=1)` como **funciones puras** con pruebas de vectores conocidos.

### 8.5 Máquina de estados del Viaje Activo

```
programado ──start──▶ en_espera ──(vence tolerancia | todos llegaron)──▶ activo
     │                    │                                              │  ▲
     └────cancel──────────┴──▶ cancelado                      open vote  ▼  │ close vote
                                                                     en_votacion
activo ──finish──▶ finalizado ──(reseñas abiertas / cierre)──▶ resenado
```

- Transiciones válidas en una **tabla declarativa** (`TRIP_TRANSITIONS`); cualquier otra → `INVALID_STATE_TRANSITION` (409).
- Control optimista con columna `version` para evitar carreras (dos `advance` simultáneos).
- **Temporizador de tolerancia:** al pasar a `en_espera` se calcula `tolerancia_vence_en = ahora + tolerancia_min`. Un scheduler (job con persistencia en BD, **no** `setTimeout` en memoria únicamente) revisa vencimientos; al vencer → `activo` **con quienes llegaron** (≥ 1 presente; si 0 presentes → `cancelado`). Debe sobrevivir reinicios del proceso.
- Notificaciones: al iniciar espera, a mitad de tolerancia, al vencer, al abrir votación, al finalizar.

### 8.6 Lógica dinámica de tiempos y votaciones

- **Horario bloqueado / retraso:** al avanzar o cada N minutos, el sistema compara la hora estimada de llegada al siguiente POI con su `horario`. Si está cerrado o el retraso acumulado supera `DELAY_THRESHOLD_MIN`, publica **aviso** y **sugiere alternativa cercana**: mismo `categoria` (o afín), `ST_DWithin` del POI bloqueado (radio configurable), **abierto a la hora estimada**, ordenados por calificación y distancia (excluyendo los ya visitados).
- **Votación:** abrir con `cierra_en = ahora + VOTE_DURATION_S` (default 60 s). Solo votan miembros **presentes** (asistencia válida). Un voto por miembro (PK; cambiar voto permitido hasta el cierre, opcional y documentado).
- **Cierre:** por tiempo o cuando votaron todos los presentes. **Mayoría simple** sobre votos emitidos; **empate → se mantiene el itinerario original** (decisión documentada). Aplica el resultado y avanza `evento_actual`; vuelve a `activo`.
- Modo sin conexión: el líder decide (`/advance`), y al sincronizar se reconcilian votos/decisiones pendientes (§10).

### 8.7 Puntos, insignias y canje

| Acción | Puntos | Regla anti-abuso |
|---|---|---|
| Check-in verificado | 10 | Una vez por POI por periodo de cooldown |
| Reseña con foto | 20 | Una por check-in |
| Reseña sin foto | 10 *(supuesto; ver §18)* | Idem |
| Publicar ruta comunitaria | 30 | Solo al pasar a `publicada` (una vez por ruta) |
| Otra persona usa tu ruta | 5 | Una vez por (usuario, ruta); no auto-uso |
| Explorar municipio nuevo | 50 | Una vez por (usuario, municipio) |

- **Tope diario:** `DAILY_POINTS_CAP` (default 200); puntos que excedan el tope no se otorgan (se registra el intento).
- Todo movimiento se escribe en `puntos_movimiento` (libro mayor inmutable); `usuario.puntos_saldo` se mantiene consistente en la **misma transacción**; reconciliación disponible por job.
- **Insignias:** reglas declarativas en `insignia.requisito` (p. ej. `{"tipo":"municipio_checkins","municipio":"Calvillo","minimo":5}`). Evaluadas por listeners de eventos; otorgamiento idempotente.
- **Canje:** descuenta puntos de forma atómica (`UPDATE ... SET puntos_saldo = puntos_saldo - $n WHERE puntos_saldo >= $n`), valida tope mensual por usuario/recompensa, genera **token aleatorio de un solo uso** (se guarda hash) con expiración (`REDEEM_TOKEN_TTL_MIN=10`); el QR codifica el token. Validación por el comercio dueño de la recompensa: marca `validado` una sola vez (segundo intento → error). Expirados no canjeados → reembolso automático de puntos (job).

### 8.8 Reputación, reseñas ponderadas y sanciones

**Calificación visible (ponderada):**

```
puntuacion = (v × R + m × C) / (v + m)
```
- `R` = promedio **ponderado** del POI: `Σ(peso_i × score_i) / Σ(peso_i)`.
- `v` = número de reseñas del POI. `C` = promedio global de todos los POIs (recalculado periódicamente). `m` = umbral (default **10**).
- `score_i` (calificación de una reseña) = promedio de **precio, servicio y accesibilidad**; **`facilidad_llegar` se almacena y muestra por separado y NO entra en la calificación global** (para que la dificultad de llegar no castigue al negocio). *(Decisión documentada en §18.)*
- `peso_i = 1 + min(reputacion_usuario / REPUTATION_SCALE, REPUTATION_MAX_BONUS)` (defaults: scale 100, max bonus 0.5).
- Siempre devolver `numeroResenas` junto a la calificación.
- Recalcular agregados del POI en la misma transacción de crear/editar/borrar reseña.

**Karma entre viajeros:** al `finalizar`, cada integrante puede calificar a los demás (puntualidad, respeto, convivencia 1–5 + etiquetas de catálogo cerrado: `Puntual`, `Líder confiable`, `Buen compañero`, etc.). Solo miembros con asistencia válida; no auto-calificación; una vez por par. Perfil expone `salidasCompletadas` y `karmaPromedio`.

**Sanciones progresivas** (umbrales configurables; contar **reportantes distintos** en ventana de 90 días, solo reportes no `descartados`):

| Reportantes distintos | Acción automática |
|---|---|
| ≥ 2 | `advertencia` (notificación) |
| ≥ 3 | `restriccion_temporal` 7 días (no crear/unirse a grupos) |
| ≥ 5 | `restriccion_temporal` 30 días |
| ≥ 8 **o** un reporte de `violencia` confirmado por Admin | `bloqueo` de cuenta |

Las sanciones automáticas son **revisables** por Admin (revocar si el reporte se descarta). Se audita todo.

### 8.9 Esquema de `horario` (jsonb)

```json
{
  "zona": "America/Mexico_City",
  "semana": {
    "lun": [{"abre": "09:00", "cierra": "18:00"}],
    "mar": [{"abre": "09:00", "cierra": "14:00"}, {"abre": "16:00", "cierra": "20:00"}],
    "dom": []
  },
  "excepciones": [{"fecha": "2026-12-25", "cerrado": true}],
  "siempreAbierto": false
}
```
Implementar `isOpenAt(horario, instant)` como función pura con pruebas (incluye turnos partidos, cierre pasada la medianoche y excepciones).

### 8.10 Verificación de identidad

- Imagen cifrada (AES-256-GCM) antes de guardarse; clave de cifrado en variable de entorno/KMS; acceso solo a Admin revisor y registrado en auditoría.
- Tras decisión (`aprobada`/`rechazada`) → **eliminar el archivo** (o conservar el mínimo configurable, `IDENTITY_RETENTION_DAYS`, default 0) y mantener solo metadatos.
- `aprobada` → `perfil_verificado = true`. Texto en API: "mitigación de riesgo, no garantía de conducta".
- Interfaz `IdentityVerificationProvider` (manual por defecto; automatizado como extensión).

### 8.11 Roles y modos

- `explorador` (todos), `creador` (automático por actividad), `anfitrion` (por reclamo verificado), `entidad` y `admin` (asignación manual).
- `modo_activo` solo selecciona qué herramientas se exponen en cliente; **la autorización del backend se basa en `usuario_rol`**, no en `modo_activo`.

---

## 9. Tiempo real (WebSocket)

- **Gateway:** namespace `/trips`, transporte WSS. Autenticación en el **handshake** con el access token (`auth.token`); rechazar si inválido/expirado. Re-autenticar al refrescar token (evento `auth:refresh`).
- **Rooms:** `viaje:{viajeId}`. Al conectar, verificar que el usuario sea miembro activo; si no → `ws exception FORBIDDEN` y desconectar.
- **Eventos cliente → servidor** (todos validados con DTOs + rate limit por socket):

| Evento | Payload | Efecto |
|---|---|---|
| `trip:join` | `{viajeId}` | Se une a la room; recibe snapshot |
| `trip:arrive` | `{lat,lng,precisionM}` | Check-in de llegada |
| `trip:position` | `{lat,lng,precisionM}` | Posición del grupo (throttle 1 cada 5 s; no se persiste historial) |
| `trip:vote:cast` | `{votacionId, opcion}` | Voto |
| `trip:advance` | `{}` | Solo organizador |
| `trip:sos` | `{lat,lng}` | Alerta a la room + notificación a contactos de confianza |

- **Eventos servidor → cliente:**

| Evento | Descripción |
|---|---|
| `trip:snapshot` | Estado completo al unirse/reconectar |
| `trip:state` | Cambio de estado |
| `trip:tolerance:tick` | Segundos restantes (cada 10–30 s) |
| `trip:member:arrived` | Llegada confirmada |
| `trip:event:current` | Evento actual del itinerario |
| `trip:alert:blocked` | Horario bloqueado/retraso + alternativa sugerida |
| `trip:vote:opened` / `trip:vote:update` / `trip:vote:closed` | Ciclo de votación |
| `trip:finished` | Fin; abre reseñas |
| `error` | Error tipado con `code` |

- **Escalabilidad:** diseñar el gateway para poder usar adaptador Redis más adelante, sin acoplarlo (inyectar `RealtimeBroadcaster`). Un solo nodo en MVP.
- **Reconexión:** el cliente envía `trip:join` y recibe `trip:snapshot`; el estado autoritativo es siempre la BD.

---

## 10. Sincronización offline-first

El cliente guarda localmente POIs, itinerarios y reseñas/check-ins pendientes y sincroniza al recuperar señal.

### 10.1 `POST /sync/push`

```json
{
  "dispositivoId": "uuid",
  "operaciones": [
    {
      "operacionId": "uuid-v4",
      "tipo": "checkin | review | attendance | vote",
      "timestampCliente": "2026-11-10T18:20:00Z",
      "payload": { }
    }
  ]
}
```

**Respuesta (200, siempre, con resultado por operación):**
```json
{
  "resultados": [
    { "operacionId": "…", "estado": "applied | duplicate | rejected", "codigo": "CHECKIN_TOO_FAR", "detalle": "…", "recursoId": "…" }
  ],
  "cursor": "…"
}
```

Reglas:
- Máximo 100 operaciones por lote; procesar **en orden de `timestampCliente`**; cada operación en su propia transacción (el fallo de una no revierte las demás).
- **Idempotencia por `operacionId`** (UNIQUE en tablas destino). Reintento ⇒ `duplicate` con el mismo `recursoId`.
- Cada operación se **revalida completamente** en servidor (ubicación, ventanas, pertenencia, código rotativo, existencia del check-in antes de reseña, etc.). El cliente no es de confianza.
- Dependencias: una `review` puede referenciar un `check-in` del mismo lote por `operacionId` (`checkInOperacionId`); resolver el orden.
- Tamaño de payload y rate limiting por usuario.

### 10.2 `GET /sync/pull?cursor=…&limit=…`

- Devuelve cambios desde el cursor (basado en `actualizado_en` + `id` para estabilidad): POIs (incl. **tombstones** con `eliminadoEn`), rutas publicadas y propias, grupos/viajes del usuario, municipios, insignias, resultados de sus reseñas.
- Respuesta: `{ cambios: { pois: [], rutas: [], ... }, cursor, hayMas }`.
- Primera sincronización (sin cursor) entrega el dataset base paginado.

---

## 11. Seguridad

Tabla de controles obligatorios (alineada al documento del proyecto y OWASP Top 10):

| Riesgo | Control a implementar | Prueba asociada |
|---|---|---|
| Robo de contraseñas | bcrypt (cost ≥ 10, default 12), password ≥ 8, jamás en logs/respuestas | Hash ≠ plano; login correcto/incorrecto |
| Robo de sesión | Access 15 min, refresh rotativo con detección de reutilización, hash en BD | Token expirado → 401; refresh reutilizado revoca familia |
| JWT manipulado | Algoritmo fijo, verificación de firma, `alg:none` rechazado | Token alterado → 401 |
| Acceso a recursos ajenos (IDOR / BOLA) | Guards por rol + `OwnershipGuard` en negocio/ruta/grupo/reseña | Usuario A edita recurso de B → 403/404 |
| Mass assignment | `whitelist` + `forbidNonWhitelisted`; DTOs separados de entidades | Enviar `rol: "admin"` en registro → 400 |
| Datos maliciosos | Validación DTO estricta (tipos, rangos, longitudes, UUIDs), sanitización de texto de reseñas | Payloads fuera de rango → 400 |
| Inyección SQL | Solo consultas parametrizadas | Payloads `' OR 1=1 --` en filtros no alteran resultado |
| Fuerza bruta/abuso | Throttler global + estricto en login/registro/reportes/sync | 429 tras exceder límite |
| Intercepción | HTTPS/WSS obligatorio en prod (redirección/HSTS), helmet, CORS con lista blanca | Cabeceras presentes |
| Reseñas falsas | Reseña solo con check-in verificado propio | Reseña sin check-in → 409/403 |
| Subida de archivos | Magic bytes, tamaño, nombres generados (no del usuario), almacenamiento fuera del webroot | Archivo `.exe` renombrado `.jpg` → 400 |
| SSRF/Path traversal | Sin fetch a URLs arbitrarias del usuario; claves de storage generadas por servidor | — |
| Webhooks de pago | Verificación de firma + idempotencia | Firma inválida → rechazo; evento repetido → una sola vez |
| Enumeración de usuarios | Mensajes genéricos en login; rate limit en registro | — |
| Secretos | Solo por variables de entorno; `.env` fuera de git; rotación documentada | Arranque falla sin secretos |
| Dependencias | `npm audit` en CI, Dependabot | CI falla en vulnerabilidades altas/críticas |
| Logging | Sin PII sensible/tokens en logs; `requestId` | Test que verifica redacción |

**Revisión OWASP por hito:** crear `test/security/` con pruebas automatizadas que intenten saltar validaciones (campos manipulados, tokens expirados/alterados, IDOR, mass assignment, SQLi, rate limit). Se ejecutan en CI antes de cada hito.

---

## 12. Privacidad y datos personales

Conforme a la **LFPDPPP** (México):

- **Aviso de privacidad:** endpoint `GET /legal/privacy` y `GET /legal/terms` (versión + fecha). El registro exige `aceptaTerminos: true` y guarda `version_terminos_aceptada` + fecha.
- **Ubicación:** solo se procesa cuando el cliente la envía en uso; **no** se persiste historial continuo de posición (`trip:position` no se guarda). Se guardan solo ubicaciones asociadas a check-in/asistencia.
- **Derechos ARCO:** `GET /users/me/data-export` (exportación de datos propios en JSON) y `DELETE /users/me` (anonimiza: nombre → "Usuario eliminado", correo → hash irreversible, borra foto, contactos de confianza y verificaciones; conserva agregados anonimizados y reseñas anonimizadas o las borra según opción).
- **Datos sensibles:** documentos de identidad cifrados, retención mínima (§8.10). Teléfonos de contactos de confianza cifrados.
- **Datos para terceros (ayuntamientos):** solo agregados con k-anonimato (§7.11).
- **Cooperación legal:** endpoint interno (Admin) para exportar registros de sesión/bitácoras de grupo/perfiles verificados ante requerimiento legal, **siempre auditado** y con registro del número de requerimiento.
- **Retención:** logs de aplicación ≤ 90 días; `auditoria` ≥ 1 año.

---

## 13. Estrategia de pruebas

### 13.1 Principios

- **TDD donde sea posible** para lógica de negocio pura (generador, ponderación, horarios, código rotativo, máquina de estados).
- Pirámide: **muchas** unitarias, **suficientes** de integración (BD real), **e2e** para flujos clave, pruebas especializadas (WS, concurrencia, seguridad).
- Las pruebas de integración/e2e usan **Testcontainers con `postgis/postgis`** (no SQLite ni mocks de BD para lógica espacial). Migraciones se ejecutan reales en cada suite.
- Reloj controlado (`ClockService` fake) para toda prueba dependiente de tiempo.
- Fábricas (`UserFactory`, `PoiFactory`, `GroupFactory`, …) y helpers para autenticar usuarios por rol.
- **Cada prueba es independiente**: limpiar BD entre tests (truncate o transacciones con rollback) o usar esquemas por worker.
- Mocks solo en bordes: storage, notificaciones, pagos, proveedor de verificación.

### 13.2 Umbrales de cobertura (bloqueantes en CI)

| Ámbito | Líneas | Ramas |
|---|---|---|
| Global | ≥ 85 % | ≥ 80 % |
| Servicios de negocio críticos (`auth`, `groups`, `trips`, `reviews`, `checkins`, `sync`, `gamification`, `routes/generator`, `hosts/payments`) | ≥ 90 % | ≥ 85 % |

Además: **0 pruebas omitidas** (`it.skip`/`xit`) sin issue enlazado.

### 13.3 Casos de prueba mínimos por módulo

**Auth**
- Registro exitoso; correo duplicado (case-insensitive); password corta; campos extra rechazados; el hash nunca se expone.
- Login OK / password incorrecta / correo inexistente → **mismo mensaje**; bloqueo tras N intentos; desbloqueo tras la ventana.
- JWT: expirado → 401; firma alterada → 401; sin token → 401; `alg:none` → 401.
- Refresh: rota; reutilización del anterior revoca la familia; logout revoca; refresh expirado.
- Rate limit en login → 429.

**POIs**
- Filtros combinados (categoría, costo, texto); paginación y límites; `nearby` ordena por distancia y respeta radio (con coordenadas conocidas de Aguascalientes); `abiertoAhora` respeta zona horaria; destacados marcados.
- OwnershipGuard: Anfitrión A no edita POI de B; Admin sí.
- Tombstone: POI borrado no aparece en listados pero sí en `sync/pull`.
- `isOpenAt`: turnos partidos, excepciones, cierre pasada medianoche, `siempreAbierto`.
- Inyección SQL en `q`.

**Rutas / generador**
- Determinismo; respeta presupuesto (quita POIs y advierte); respeta horarios (no programa cerrados); respeta ventana de tiempo; costo por persona; sin candidatos → respuesta vacía con advertencia; límites de entrada.
- Ciclo de vida: `borrador → validada → publicada`; transiciones inválidas → 409; validar falla con horarios incompatibles; editar publicada regresa a borrador; copia conserva créditos y suma puntos al autor original (una vez por usuario).
- Permisos: Explorador no puede publicar rutas comunitarias (requiere Creador); solo dueño edita.

**Check-in y reseñas**
- Check-in dentro/fuera de radio (borde exacto: radio y radio+1 m); precisión mala; cooldown; fecha futura; fecha muy antigua.
- Reseña: sin check-in → error; check-in de otro usuario → error; segunda reseña al mismo check-in → `REVIEW_ALREADY_EXISTS`; fuera de ventana → `REVIEW_WINDOW_EXPIRED`.
- **Ponderación:** casos con valores conocidos (calcular a mano), pocos vs. muchos votos, peso por reputación, **`facilidad_llegar` no altera la calificación global**, recalculo al editar/borrar.
- Promoción a Creador al cumplir 5 check-ins + 3 reseñas (exactamente en el límite y uno antes).

**Grupos**
- Crear con validaciones (cupo 2–50, fecha futura); join OK; join duplicado idempotente; join a grupo lleno; leave reabre; kick; cancel notifica.
- **Concurrencia:** N joins simultáneos con 1 cupo → 1 éxito; N joins del mismo usuario → 1 registro.
- Usuario restringido no puede crear/unirse. Secreto solo para miembros.
- Recurrentes: el job genera la siguiente instancia sin duplicar (ejecutar el job dos veces).

**Viaje activo**
- Todas las transiciones válidas e inválidas (tabla completa parametrizada con `it.each`).
- Tolerancia: vence → `activo` con presentes; 0 presentes → `cancelado`; sobrevive a reinicio (simular recarga del scheduler con estado en BD).
- Código rotativo: vectores conocidos; ±1 paso válido; ±2 inválido; código de otro viaje inválido; ubicación lejana rechazada; fuera de ventana rechazada; no miembro rechazado; operación duplicada → `duplicate`.
- Votación: mayoría; **empate mantiene itinerario**; solo presentes votan; voto doble no cuenta doble; cierre por tiempo y por completar votos; aplica resultado y avanza.
- Horario bloqueado → alerta + alternativa cercana abierta, no visitada.
- Control optimista: dos `advance` concurrentes → uno solo avanza.

**WebSocket** (con `socket.io-client` real contra la app levantada)
- Handshake sin token / token expirado → rechazo.
- No miembro no puede unirse a la room ni recibir eventos de otra room.
- Flujo completo: 3 clientes → llegada → tolerancia → evento actual → votación → resultado → fin.
- Reconexión recibe `snapshot` correcto.
- Evento con payload inválido → `error` sin tumbar el gateway; rate limit por socket.

**Sync**
- Lote mixto (applied/duplicate/rejected); reenviar el mismo lote → todo `duplicate`; orden por timestamp; reseña dependiente de check-in del mismo lote; límite de 100; una operación inválida no revierte las demás; `pull` incremental con tombstones y cursor estable (sin perder ni repetir ítems con mismo `actualizado_en`).

**Gamificación**
- Puntos por cada acción; **tope diario**; sin doble otorgamiento (misma referencia); saldo = suma del libro mayor (invariante); insignias idempotentes; municipio nuevo 1 sola vez.
- Canje: saldo insuficiente; tope mensual; QR de un solo uso; expirado → reembolso; validación por comercio ajeno → 403; **canjes concurrentes con saldo para uno solo → 1 éxito** (sin saldo negativo).

**Safety**
- Reporte duplicado bloqueado; umbrales de sanciones (parametrizados con `it.each`); solo reportantes distintos cuentan; revocar al descartar; usuario sancionado no se une; auditoría registrada.
- Enlace compartido: expira, revocable, solo lectura, no filtra datos sensibles.

**Hosts / pagos**
- Reclamo → verificación Admin → rol `anfitrion`; stats solo del dueño; promociones requieren Premium.
- Webhook: firma válida OK; **firma inválida rechazada**; evento repetido no duplica; cálculo de comisión 4 % y neto (200 → 192); suscripción vencida quita destacado.

**Analytics**
- Solo rol `entidad`; **ninguna respuesta contiene `usuario_id` ni PII** (prueba de esquema); celdas con < 5 registros suprimidas.

**Seguridad transversal** (`test/security/`)
- IDOR en cada recurso con dueño; mass assignment (`rol`, `reputacion`, `puntos_saldo`, `perfil_verificado`); SQLi en todos los parámetros de filtro; cabeceras helmet; CORS; rate limits; subida de archivo malicioso; logs sin tokens/passwords.

**Contratos / OpenAPI**
- Test que genera el documento OpenAPI y verifica que todos los endpoints tienen respuestas documentadas y que los DTOs de respuesta **no** incluyen campos sensibles (`hash_password`, `token_hash`, `secreto_cifrado`).

**Migraciones**
- Test que aplica todas las migraciones desde cero, hace `down` y `up` (reversibilidad) y valida índices/extensiones requeridos.

### 13.4 Rendimiento (smoke, no bloqueante al inicio)

- Script k6 o autocannon para `/pois/nearby` con ≥ 10 000 POIs sembrados: **p95 < 300 ms** en entorno de CI/contenedor.
- Verificar con `EXPLAIN` que las consultas espaciales usan el índice GIST (prueba que falle si hay `Seq Scan` en `poi` para `nearby`).

---

## 14. Infraestructura, DevOps y observabilidad

### 14.1 Variables de entorno (`.env.example`)

```
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:8081

# Base de datos
DATABASE_URL=postgresql://trekko:trekko@localhost:5432/trekko
DB_SSL=false

# Auth
JWT_ACCESS_SECRET=change-me-min-32-chars
JWT_ACCESS_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
BCRYPT_COST=12
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15

# Cifrado
DATA_ENCRYPTION_KEY=base64-32-bytes
IDENTITY_RETENTION_DAYS=0

# Storage (S3 compatible)
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_BUCKET=trekko
STORAGE_ACCESS_KEY=minio
STORAGE_SECRET_KEY=minio12345
STORAGE_PRIVATE_BUCKET=trekko-private

# Pagos
PAYMENT_PROVIDER=fake   # fake | mercadopago | stripe
PAYMENT_WEBHOOK_SECRET=change-me
PREMIUM_PRICE_MXN=200
PAYMENT_FEE_PERCENT=4

# Negocio (todos con defaults en business.config.ts)
CHECKIN_RADIUS_M=150
CHECKIN_MAX_ACCURACY_M=100
CHECKIN_COOLDOWN_HOURS=12
MEETING_POINT_RADIUS_M=100
ATTENDANCE_CODE_STEP_S=180
VOTE_DURATION_S=60
DAILY_POINTS_CAP=200
RATING_BAYES_M=10
CREATOR_MIN_CHECKINS=5
CREATOR_MIN_REVIEWS=3
ANALYTICS_MIN_K=5

# Notificaciones
NOTIFICATIONS_PROVIDER=fake  # fake | expo
```

### 14.2 Docker

- `Dockerfile` multi-stage (deps → build → runtime `node:20-alpine`, usuario **no root**, `HEALTHCHECK`).
- `docker-compose.yml`: `api`, `db` (postgis), `minio` (+ bucket init). Volúmenes persistentes. `depends_on` con healthchecks.
- Producción (referencia): VPS + proxy inverso (nginx/Caddy) con TLS, límites de tamaño, `X-Forwarded-*`, compresión; respaldos de PostgreSQL diarios (`pg_dump` programado) y script de restauración documentado.

### 14.3 Scripts npm requeridos

`start:dev`, `build`, `lint`, `typecheck`, `test` (unit), `test:int`, `test:e2e`, `test:ws`, `test:security`, `test:cov`, `test:all`, `migration:generate`, `migration:run`, `migration:revert`, `seed`, `seed:demo`, `openapi:export`.

### 14.4 CI (GitHub Actions)

Pasos: instalar → lint → typecheck → unit (con cobertura) → integración/e2e (servicio PostGIS) → seguridad → build → `npm audit --audit-level=high` → exportar OpenAPI como artefacto → subir cobertura. **Falla el pipeline** si no se cumplen umbrales (§13.2).

### 14.5 Observabilidad

- Logs JSON con `requestId`, `userId` (si aplica), latencia, status.
- Métricas Prometheus (`/metrics`, protegido): latencia por ruta, errores, conexiones WS, jobs.
- Auditoría en BD (§5.9).
- Manejo de apagado limpio (`enableShutdownHooks`).

### 14.6 Jobs programados (`@nestjs/schedule` con estado persistente)

- Vencimiento de tolerancia de viajes (cada 15 s) — idempotente y seguro ante múltiples instancias (`SELECT ... FOR UPDATE SKIP LOCKED`).
- Generación de instancias de grupos recurrentes.
- Expiración de canjes y reembolso.
- Vencimiento de suscripciones y destacados.
- Limpieza de refresh tokens expirados.
- Eliminación de documentos de identidad vencidos.
- Recalculo de promedio global `C` y reconciliación de puntos.

---

## 15. Seeds y datos iniciales

- **Municipios:** Aguascalientes (capital) y los cuatro Pueblos Mágicos (**Calvillo, Real de Asientos, San José de Gracia y Pabellón de Hidalgo**) con `centro` aproximado y `es_pueblo_magico`.
- **POIs de muestra** (23): lugares reales de Aguascalientes y sus cuatro Pueblos Mágicos. Horarios y costos son estimados; sin reseñas ni contactos inventados.
- **Rutas Trekko Originals** (5): una para Aguascalientes y una para cada Pueblo Mágico.
- **Insignias base:** "Explorador de Calvillo", "Explorador de Real de Asientos", "Explorador de San José de Gracia", "Primer check-in", "Reseñador", "Creador de rutas", "Viajero puntual".
- **Usuarios demo** (solo en `seed:demo`, nunca en producción): admin, entidad, anfitrión, creador, explorador. Contraseñas por variable de entorno.
- Seeds **idempotentes** (se pueden ejecutar varias veces).
- Script para generar **10 000 POIs sintéticos** para pruebas de rendimiento.

---

## 16. Plan de implementación por hitos

Cada hito termina con: código + pruebas + migraciones + OpenAPI actualizado + README/ARCHITECTURE actualizados + CI en verde.

| Hito | Contenido | Entregables clave |
|---|---|---|
| **H0 — Bootstrap** | Repo, Nest, TS estricto, config validada, TypeORM + PostGIS, migración base, Docker compose, ESLint/Prettier/Husky, CI, filtro de errores RFC 7807, logging, health, Swagger, Clock/Crypto, helpers de test | `docker compose up` levanta todo; test de humo e2e verde |
| **H1 — Auth y usuarios** | Registro, login, refresh rotativo, logout, `me`, roles, throttling, bloqueo por intentos, guards, perfil, términos | Suite auth completa + seguridad básica |
| **H2 — Catálogo de POIs** | Municipios, POIs, filtros, `nearby` PostGIS, horarios, `abiertoAhora`, fotos (storage), métricas, tombstones, seeds | Rendimiento < 300 ms p95 con 10k POIs |
| **H3 — Rutas e itinerarios** | CRUD y ciclo de vida, créditos, generador determinista, costo/duración, guardados, copia | **Cierra Fase 1** |
| **H4 — Sync, check-in y reseñas** | Check-ins verificados, reseñas con ponderación, sync push/pull idempotente, promoción a Creador | Pruebas de idempotencia y tombstones |
| **H5 — Grupos** | Grupos públicos, cupos transaccionales, secreto de grupo, recurrentes, restricciones | Prueba de concurrencia de cupos |
| **H6 — Viaje Activo** | Máquina de estados, gateway WS, tolerancia persistente, código rotativo, votaciones, alertas de horario, alternativas | Suite WS + e2e flujo completo |
| **H7 — Gamificación, reputación y seguridad social** | Puntos, tope diario, insignias, mapa, ranking, canje QR, karma, reportes y sanciones, emergencia, enlaces compartidos, verificación de identidad | Invariantes de puntos y sanciones |
| **H8 — Anfitriones, pagos y analítica** | Reclamo de negocio, suscripción Premium, webhooks, promociones, stats, analítica anonimizada | k-anonimato probado; webhooks seguros |
| **H9 — Endurecimiento** | Auth social (opcional), revisión OWASP completa, rendimiento, jobs robustos, documentación final, colección Postman/Bruno, runbook de despliegue y respaldos | Informe de seguridad en `docs/` |

---

## 17. Definition of Done global

Un cambio **no está terminado** hasta cumplir **todo**:

- [ ] Compila con TS estricto, sin `any` injustificado; ESLint y Prettier sin errores.
- [ ] Pruebas nuevas para cada regla de negocio y cada rama de error; umbrales de cobertura cumplidos.
- [ ] Pruebas de seguridad aplicables (IDOR, validación, rate limit) incluidas.
- [ ] Migración reversible creada y probada (up/down); sin cambios manuales de esquema.
- [ ] Endpoints documentados en Swagger (request, response, errores, auth).
- [ ] DTOs de respuesta no filtran campos sensibles.
- [ ] Sin secretos en el repo; variables nuevas añadidas a `.env.example` y validadas.
- [ ] Logs sin PII/tokens; errores con códigos del catálogo.
- [ ] Reglas configurables en `business.config.ts`, no hardcodeadas.
- [ ] README/ARCHITECTURE/ASSUMPTIONS actualizados.
- [ ] CI completo en verde, incluido `npm audit`.
- [ ] Commits con Conventional Commits, un hito = PR(s) revisables.

---

## 18. Supuestos, ambigüedades y decisiones abiertas

> **Instrucción para el agente:** ante cualquier punto ambiguo no cubierto aquí, **no improvisar en silencio**: tomar la decisión más conservadora/segura, implementarla, y **registrarla en `docs/ASSUMPTIONS.md`** con fecha, razón y alternativa descartada.

| # | Tema | Decisión propuesta |
|---|---|---|
| 1 | **Pagos** | El documento excluye "pasarela de pagos para reservas", pero incluye cobro de suscripción Premium con comisión ≈ 4 %. Se implementa solo el cobro de **suscripción** vía `PaymentProvider` abstracto; **no** hay reservas con pago. |
| 2 | **Cuarto Pueblo Mágico** | Pabellón de Hidalgo fue confirmado como el cuarto Pueblo Mágico de Aguascalientes; incluirlo en los datos base. |
| 3 | **Facilidad para llegar** | Se califica por separado y **no** entra en la calificación global del POI (coherente con §5.3 del proyecto). |
| 4 | **Puntos de reseña sin foto** | El documento solo da 20 pts por "reseña con foto"; se asume 10 pts sin foto. Configurable. |
| 5 | **Empate en votación** | Gana "mantener itinerario". |
| 6 | **Secreto de grupo** | Cualquier miembro con el secreto puede calcular el código; la protección real es la verificación de ubicación + ventana temporal en servidor. Se documenta como riesgo aceptado. |
| 7 | **Estados de ruta** | La tabla de ciclo de vida del proyecto incluye "Con grupo / En ejecución / Calificada" como etapas; se modelan como **estados derivados/contadores**, no como estados de `ruta.estado`. |
| 8 | **Roles** | `entidad` y `admin` se agregan (no están como "modos" en el documento) por necesidad de analítica y moderación. |
| 9 | **WebSocket lib** | socket.io por soporte de rooms/reconexión; si se prefiere `ws` puro, mantener la misma semántica de eventos. |
| 10 | **Autenticación social** | Declarada en el proyecto ("correo o autenticación social"); se entrega como opcional en H9 detrás de interfaz. |
| 11 | **Verificación de identidad** | Manual (Admin) por defecto; automática vía proveedor como extensión (el presupuesto prevé ≈ $15 por verificación). |
| 12 | **Idempotencia de `join`** | Responder 200 con estado actual si ya es miembro activo. |

---

## 19. Anexos

### 19.1 Consulta `nearby` de referencia (parametrizada)

```sql
SELECT p.*,
       ST_Distance(p.ubicacion::geography,
                   ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distancia_m
FROM poi p
WHERE p.eliminado_en IS NULL
  AND ST_DWithin(p.ubicacion::geography,
                 ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                 $3)
  AND ($4::text[] IS NULL OR p.categoria = ANY($4))
  AND ($5::numeric IS NULL OR p.costo_promedio <= $5)
ORDER BY distancia_m ASC
LIMIT $6 OFFSET $7;
```
> Nota: para que el índice GIST se use con `geography`, crear el índice sobre `(ubicacion::geography)` o usar `geography(Point,4326)` como tipo de columna. Verificar con `EXPLAIN` (§13.4).

### 19.2 Código TOTP-like (referencia de diseño)

```ts
// Pseudocódigo — implementar como función pura y testeable
function attendanceCode(secret: Buffer, viajeId: string, tsSeconds: number, stepS = 180): string {
  const key = hkdf(secret, viajeId);                        // clave derivada por viaje
  const counter = Math.floor(tsSeconds / stepS);
  const mac = hmacSha256(key, uint64BE(counter));
  const offset = mac[mac.length - 1] & 0x0f;                // dynamic truncation
  const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) |
              (mac[offset + 2] << 8) | mac[offset + 3];
  return String(bin % 1_000_000).padStart(6, '0');
}
// verify(): comparar en tiempo constante (timingSafeEqual) para counter-1, counter, counter+1
```

### 19.3 Fórmula de ponderación (ejemplo numérico para pruebas)

- POI con `v = 4` reseñas, `R = 5.0`, `C = 3.8`, `m = 10`:
  `puntuacion = (4×5.0 + 10×3.8) / 14 = (20 + 38) / 14 = 4.142…` → **4.14**
- POI con `v = 100`, `R = 4.5`: `(100×4.5 + 10×3.8)/110 = 488/110 = 4.436…` → **4.44**

### 19.4 Cálculo de suscripción (ejemplo para pruebas)

- Bruto 200.00 → comisión 4 % = 8.00 → **neto 192.00**.
- 75 negocios en el mes 5: bruto 15 000, comisión 600, neto 14 400 (consistente con el presupuesto del proyecto).

### 19.5 Catálogo de eventos de dominio internos

`user.registered`, `user.role.granted`, `checkin.created`, `review.created`, `review.deleted`, `route.published`, `route.copied`, `group.created`, `group.joined`, `group.left`, `trip.started`, `trip.state.changed`, `trip.finished`, `vote.closed`, `report.created`, `sanction.applied`, `subscription.activated`, `reward.redeemed`. Implementar con `@nestjs/event-emitter`; los listeners (gamificación, notificaciones, auditoría) **no deben romper** la operación principal (manejo de errores aislado y registrado).

---

*Fin del documento.*
