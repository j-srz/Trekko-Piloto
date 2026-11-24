# 01 — Reglas globales, estructura del repositorio y convenciones

Aplica a **todos** los pasos. Si un paso contradice este archivo, gana este archivo y se registra la contradicción.

## 1. Stack fijado (spec §3.2, Tabla 13)

| Capa | Tecnología | Notas obligatorias |
|---|---|---|
| Monorepo | **pnpm workspaces** | Node LTS vigente; fijar versiones exactas en el bootstrap (`.nvmrc`, `packageManager`) |
| Móvil | React Native (**Expo**), TypeScript estricto | Build con EAS. WatermelonDB exige **development build**, no Expo Go |
| Datos locales | **WatermelonDB** (SQLite) | La UI lee primero de local |
| Sesión | **Expo SecureStore** | Nunca AsyncStorage para tokens |
| Mapas | Google Maps SDK (`react-native-maps`, provider Google) | Ver riesgo D-14 |
| Backend | **NestJS** (TypeScript estricto), REST + Gateway WebSocket | Monolito modular |
| BD | **PostgreSQL + PostGIS** | ORM: TypeORM con `synchronize: false`; migraciones propias |
| Auth | JWT acceso 15 min + refresh con rotación | bcrypt costo ≥ 10 (usar 12) |
| Tiempo real | Socket.IO sobre el gateway de NestJS (WSS) | Ver `contratos/CONTRATO_WS_SYNC_TOTP.md` |
| Infra | VPS + Docker + Nginx + Certbot + GitHub Actions | |
| Pruebas | Jest, Supertest, Maestro/Detox, k6 | |

## 2. Estructura del repositorio (NO modificar)

```
trekko/
├─ apps/
│  ├─ api/
│  │  ├─ src/
│  │  │  ├─ main.ts
│  │  │  ├─ app.module.ts
│  │  │  ├─ config/                 # env.schema.ts, configuration.ts
│  │  │  ├─ common/
│  │  │  │  ├─ guards/              # jwt-auth.guard.ts, roles.guard.ts
│  │  │  │  ├─ decorators/          # roles.decorator.ts, usuario-actual.decorator.ts, publico.decorator.ts
│  │  │  │  ├─ filters/             # http-exception.filter.ts
│  │  │  │  ├─ interceptors/        # request-id, logging
│  │  │  │  ├─ pipes/
│  │  │  │  ├─ dto/                 # paginacion.dto.ts
│  │  │  │  ├─ sync/                # SyncController, SyncRegistry, decorador @SyncHandler (infraestructura, NO es un módulo de negocio)
│  │  │  │  └─ utils/               # dinero.ts, fechas.ts, geo.ts
│  │  │  ├─ database/
│  │  │  │  ├─ data-source.ts
│  │  │  │  ├─ migrations/          # <timestamp>-<Nombre>.ts  (SQL crudo en up/down)
│  │  │  │  └─ seeds/
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/                # Autenticación y perfiles
│  │  │  │  ├─ catalogo/            # Catálogo y POIs
│  │  │  │  ├─ rutas/               # Rutas e itinerarios
│  │  │  │  ├─ gamificacion/        # (F2) Gamificación y reputación
│  │  │  │  ├─ social/              # (F2) Social y grupos + Viaje Activo + Gateway
│  │  │  │  ├─ anfitriones/         # Portal de anfitriones (panel interno en F1)
│  │  │  │  └─ analitica/           # (F2)
│  │  │  └─ cli/                    # comandos (import-pois, etc.)
│  │  └─ test/                      # e2e con Supertest
│  └─ mobile/
│     ├─ app/                       # expo-router
│     │  ├─ (auth)/                 # login.tsx, registro.tsx
│     │  ├─ (tabs)/                 # inicio.tsx, grupos.tsx, mapa.tsx, perfil.tsx  (orden: Inicio, Grupos, Mapa, Perfil)
│     │  ├─ poi/[id].tsx
│     │  ├─ itinerario/             # nuevo.tsx, [id].tsx
│     │  ├─ ruta/[id].tsx
│     │  └─ viaje/[id].tsx          # (F2)
│     └─ src/
│        ├─ core/                   # api/, auth/, db/, sync/, theme/, a11y/, config/, conectividad/
│        ├─ features/<feature>/     # components/, hooks/, services/, types.ts
│        └─ shared/ui/              # Boton, Tarjeta, Campo, Chip, Banner, Pantalla…
├─ packages/
│  ├─ contracts/                    # enums, tipos de respuesta, constantes compartidas (sin lógica)
│  └─ itinerario-core/              # lógica PURA del generador (sin Node ni RN); la usan api y mobile
├─ infra/                           # docker/, nginx/, scripts/ (backup, restore), k6/
├─ docs/                            # specs/ (este paquete), DECISIONES.md, PROGRESO.md
└─ .github/workflows/
```

### 2.1 Estructura interna de TODO módulo del backend

```
modules/<modulo>/
├─ index.ts                  # API PÚBLICA: exporta SOLO servicios públicos, eventos y tipos. Nada más.
├─ <modulo>.module.ts
├─ controllers/*.controller.ts
├─ dto/*.dto.ts              # class-validator
├─ services/*.service.ts     # reglas de negocio
├─ repositories/*.repository.ts   # ÚNICO lugar con acceso a BD / SQL parametrizado
├─ entities/*.entity.ts
├─ events/*.event.ts
└─ __tests__/                # unitarias del módulo
```

### 2.2 Reglas de frontera (se verifican en CI)

1. Un módulo **solo** importa de otro módulo vía `modules/<otro>/index.ts`. Prohibido importar `repositories/`, `entities/` o `dto/` internos ajenos.
2. **Ningún módulo lee ni escribe tablas de otro.** Se colabora por servicio público o por evento interno.
3. SQL únicamente en `repositories/`. Prohibido SQL en services o controllers.
4. Cadena obligatoria: `Controller → (Guards, DTO) → Service → Repository`.
5. En el móvil: `Screen → hook → service → (repositorio local WatermelonDB | cliente API)`. Las pantallas **no** importan `axios/fetch` ni `@nozbe/watermelondb` directamente.
6. `packages/itinerario-core` no importa nada de Node, Nest, React ni Expo.
7. Se hace cumplir con `dependency-cruiser` (api) y `eslint no-restricted-imports` (mobile) — configurados en BACK-01 y FRONT-01.

## 3. Nombres (respetar literalmente)

**Idioma:** dominio en español; sufijos técnicos en inglés; comentarios y UI en español.

| Concepto de la spec | Tabla SQL | Clase/entidad TS |
|---|---|---|
| Usuario | `usuario` | `Usuario` |
| Verificación de identidad | `verificacion_identidad` | `VerificacionIdentidad` |
| Reporte / Sanción | `reporte` / `sancion` | `Reporte` / `Sancion` |
| Negocio / Suscripción / Promoción | `negocio` / `suscripcion` / `promocion` | `Negocio` / `Suscripcion` / `Promocion` |
| POI / Categoría / Municipio | `poi` / `categoria` / `municipio` | `Poi` / `Categoria` / `Municipio` |
| Ruta / parada | `ruta` / `ruta_poi` | `Ruta` / `RutaPoi` |
| Itinerario guardado | `itinerario` / `itinerario_parada` | `Itinerario` / `ItinerarioParada` |
| Check-in / Reseña | `check_in` / `resena` | `CheckIn` / `Resena` |
| Insignias | `insignia` / `usuario_insignia` | `Insignia` / `UsuarioInsignia` |
| Recompensa / Canje | `recompensa` / `canje` | `Recompensa` / `Canje` |
| Grupo / Miembro | `grupo` / `grupo_miembro` | `Grupo` / `GrupoMiembro` |
| Viaje Activo / Evento / Voto | `viaje_activo` / `evento_viaje` / `voto` | `ViajeActivo` / `EventoViaje` / `Voto` |
| Calificación entre pares | `calificacion_par` | `CalificacionPar` |
| Servicios clave | — | `ItinerarioGenerator`, `CalculadorReputacion`, `JwtAuthGuard`, `RolesGuard`, `CreateRutaDto` |

- Archivos: `kebab-case` (`crear-ruta.dto.ts`, `ruta.repository.ts`). Clases: `PascalCase`. Variables/funciones: `camelCase`. Constantes: `SCREAMING_SNAKE`.
- SQL: `snake_case`, singular, español. PK `id`. FK `<tabla>_id`. Índices `idx_<tabla>_<cols>`. Únicos `uq_<tabla>_<cols>`. Checks `ck_<tabla>_<regla>`.
- JSON de la API y query params: **camelCase** (la spec usa `recompensaId`, `opId`). BD en `snake_case`; el mapeo vive en el repository.
- Eventos internos: `<modulo>.<entidad>.<verbo_pasado>` (ver §6).
- Ramas: `step/<ID>` (ej. `step/BACK-03`). Commits: Conventional Commits (`feat(catalogo): …`, `test(rutas): …`, `chore(db): …`).

## 4. Convenciones transversales

| Tema | Regla |
|---|---|
| IDs | UUID v4 (`gen_random_uuid()`); `smallserial` solo en catálogos (`municipio`, `categoria`, `insignia`) |
| Fechas | `timestamptz` en UTC; ISO 8601 en JSON; fechas de calendario `date` (`YYYY-MM-DD`); horas `HH:mm` |
| Dinero | MXN, `numeric(10,2)`; en JSON `number` con ≤ 2 decimales; cálculos en centavos enteros (`common/utils/dinero.ts`) |
| Coordenadas | JSON: `{ "lat": number, "lng": number }`. BD: `geometry(Point,4326)` con `ST_MakePoint(lng, lat)` (**lng primero**) |
| Distancias | Consultas por radio con `geography` (metros). Índice GiST sobre `ubicacion` y sobre `(ubicacion::geography)` |
| Paginación | `page` (≥1, def. 1), `limit` (1–50, def. 20). Lista → `{ "data": [...], "meta": { "page", "limit", "total" } }` |
| Respuesta simple | Objeto directo (sin envoltorio) |
| Errores | `{ "statusCode", "codigo", "mensaje", "requestId", "detalles"? }`. Mensajes generales, sin detalles internos. `detalles` solo en 400 de validación (`[{campo, mensaje}]`) |
| Códigos HTTP | 200, 201, 400, 401, 403, 404, 409, 429 (Tabla de la spec §3.6.3) |
| Idempotencia | Operaciones repetibles reciben `opId` (UUID v4 generado en el cliente). Reintento con mismo `opId` no duplica |
| Validación | DTO + `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`. Nunca confiar en el cliente |
| Autorización | `JwtAuthGuard` global (excepto `@Publico()`); `RolesGuard` con `@Roles(...)`; verificación de **propiedad** en el service |
| Jerarquía de roles | `creador` y `anfitrion` ⊇ `explorador`. `admin` ⊇ todos. `institucional` solo analítica. Un usuario puede tener varios roles; `modoActivo` decide qué herramientas ve |
| Logs | Pino estructurado con `requestId`. Nunca registrar contraseñas, tokens, secretos ni coordenadas exactas de usuarios |
| i18n | UI en español; todas las cadenas en `src/core/i18n/es.ts` (móvil) |

## 5. Variables de entorno (archivo `.env.example` del api; no inventar otras sin registrar)

| Variable | Uso |
|---|---|
| `NODE_ENV`, `PORT` | Ejecución |
| `DATABASE_URL` | Conexión PostgreSQL (solo el api la conoce) |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL=900` | Access token (15 min) |
| `REFRESH_TTL_DAYS=30` | Vigencia del refresh |
| `BCRYPT_COST=12` | Hash |
| `CORS_ORIGINS` | Lista restringida |
| `THROTTLE_TTL`, `THROTTLE_LIMIT`, `LOGIN_THROTTLE_LIMIT=5` | Rate limiting |
| `GRUPO_SECRET_KEY` | AES-256-GCM del secreto de grupo (F2) |
| `STORAGE_*` | Almacén de objetos S3-compatible (F2: fotos, identidad) |
| `PASARELA`, `PASARELA_ACCESS_TOKEN`, `PASARELA_WEBHOOK_SECRET` | Pagos de suscripción |
| `ITINERARIO_TARIFA_KM=5`, `ITINERARIO_VELOCIDAD_KMH=40`, `ITINERARIO_FACTOR_RUTA=1.3` | Motor de itinerarios (D-05) |
| `ADMIN_SEED_CORREO`, `ADMIN_SEED_PASSWORD` | Solo para el seed (nunca valores reales en el repo) |
| `EXPO_PUSH_*`, `GOOGLE_MAPS_API_KEY` | Notificaciones / mapas (mapas en secretos de EAS) |

## 6. Eventos internos (EventEmitter; emitir **después** del commit de la transacción)

| Evento | Emite | Escucha | Efecto |
|---|---|---|---|
| `auth.usuario.registrado` | auth | — | Bitácora |
| `anfitriones.suscripcion.activada` / `.vencida` | anfitriones | catalogo | Actualiza `poi.destacado` de los POIs del negocio |
| `gamificacion.checkin.registrado` | gamificacion | gamificacion, auth | Puntos, insignias, promoción a Creador |
| `gamificacion.resena.creada` | gamificacion | catalogo | Persiste `puntuacion_visible` y `num_resenas` del POI |
| `rutas.ruta.publicada` | rutas | gamificacion | +30 puntos al autor |
| `rutas.ruta.usada` | rutas | gamificacion | +5 puntos al autor |
| `social.llegada.confirmada` | social | gamificacion | Crea `check_in` por código de grupo |
| `social.viaje.finalizado` | social | gamificacion | Habilita reseñas/calificaciones, notificaciones |
| `auth.sancion.aplicada` | auth | social | Bloquea organizar/unirse a grupos |

## 7. Registro de decisiones (supuestos donde la spec no define el detalle)

Cada decisión es **editable por el humano**; un agente no la cambia por su cuenta.

| ID | Decisión | Motivo |
|---|---|---|
| D-01 | ORM TypeORM; consultas espaciales con SQL parametrizado dentro de repositories | La spec pide "parametrizadas mediante ORM" y PostGIS |
| D-02 | PK UUID v4 | Evita enumeración de recursos (A01) |
| D-03 | `usuario.roles rol_usuario[]` + `modo_activo`; roles extra `institucional` y `admin` | Modos no excluyentes (§5.1); Fase 1 necesita admin interno |
| D-04 | Tablas no listadas en la Tabla 15 pero implícitas: `municipio`, `refresh_token`, `itinerario`, `itinerario_parada`, `sync_operacion`, `asistencia`, `puntos_movimiento`, `dispositivo_push`, `poi_evento` | Soportan RF-02, RF-07, RF-14, RF-17, estadísticas y notificaciones |
| D-05 | Motor de itinerarios: tarifa $5/km, 40 km/h, factor 1.3 sobre distancia recta | Derivado del ejemplo de la Tabla 27 (40 km → $200, 60 min) |
| D-06 | Monorepo pnpm; paquetes `contracts` e `itinerario-core` | Evita duplicar enums y permite generar itinerarios offline con el mismo algoritmo |
| D-07 | expo-router para navegación | Pestañas Inicio, Grupos, Mapa, Perfil por archivos |
| D-08 | Calificación general de una reseña = promedio de precio, servicio y accesibilidad; **facilidad_llegada se guarda pero no entra** | §5.3: la dificultad de acceso no debe castigar al negocio |
| D-09 | Panel interno de Fase 1 = endpoints `/admin/*` + Swagger + CLI de importación CSV. **No incluye UI web** | La spec no define UI para el panel; la versión web está fuera de alcance |
| D-10 | Autenticación social = paso opcional (Google); correo+contraseña es obligatorio | RF-01 admite ambas |
| D-11 | Pasarela por defecto: Mercado Pago, detrás de `PasarelaPagoPort` (intercambiable por Stripe) | Spec admite cualquiera; México |
| D-12 | Almacén de objetos S3-compatible con URLs prefirmadas | §3.1 |
| D-13 | Puntos: check-in 10, reseña con foto 20, reseña sin foto 10, publicar ruta 30, uso de ruta 5, municipio nuevo 50; tope diario 100 pts (sin contar municipio nuevo) | Tabla 45; los topes son propuesta |
| D-14 | **Riesgo:** Google Maps SDK no permite precargar teselas por código. Fase 1 garantiza pines, listas e itinerarios offline; el mapa base sin red depende del caché del SDK. Si se exige mapa base offline real → evaluar MapLibre (cambio de spec) | RNF-02 / §1.4 obj. 7 |
| D-15 | Peso por reputación en reseñas: `peso = 1 + 0.5 × (reputacion / 5)` (1.0–1.5) | La spec nombra `pesoSegunReputacion()` sin fórmula |
| D-16 | TOTP de grupo: HMAC-SHA1, 6 dígitos, paso 180 s, ventana ±1 | "Cambia cada pocos minutos" |

## 8. Seguridad base (siempre activa)

HTTPS/WSS obligatorio · helmet · CORS restringido · bcrypt ≥ 10 · access 15 min + refresh rotatorio con detección de reutilización · rate limiting (`@nestjs/throttler`) · DTOs con whitelist · SQL parametrizado · mensajes de error genéricos en auth · ninguna petición del servidor a URLs dadas por el usuario (SSRF) · ubicación del usuario solo en uso (foreground) · secretos solo en variables de entorno.
