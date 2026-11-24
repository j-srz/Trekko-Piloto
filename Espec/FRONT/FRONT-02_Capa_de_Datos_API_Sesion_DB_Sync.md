# FRONT-02 — Capa de datos: cliente API, sesión segura, WatermelonDB y sincronización

**Fase:** 1 · **Depende de:** FRONT-01 · **Spec origen:** §3.1, §3.6.1, §3.6.2, §3.6.4, §3.12, RF-02, RF-07, RNF-02 · **Hito:** H2

## 1. Objetivo
Cimientos **Offline-First**: cliente HTTP con refresh automático, sesión en SecureStore, base local WatermelonDB, cola de sincronización y motor de sync (pull de catálogo + push de operaciones).

## 2. Prerrequisitos
FRONT-01 aprobado; `contratos/CONTRATO_API_REST.md` y `CONTRATO_WS_SYNC_TOTP.md §1`.

## 3. Archivos permitidos
`apps/mobile/src/core/{api,auth,db,sync,conectividad,config}/**`, `apps/mobile/src/features/catalogo/services/**`, pruebas asociadas.

## 4. Tareas

1. **Config:** `core/config/env.ts` (URL base del API desde `EXPO_PUBLIC_API_URL`; **HTTPS obligatorio** salvo `__DEV__`).
2. **Sesión (`core/auth/sesion.store.ts`):** tokens **solo en Expo SecureStore**; estado en memoria (Zustand) con `usuario`, `roles`, `modoActivo`. Al arrancar, restaura sesión sin red.
3. **Cliente API (`core/api/cliente.ts`):** adjunta `Authorization`; ante `401 TOKEN_EXPIRADO` hace **un solo refresh concurrente** (mutex), reintenta la petición original una vez; si el refresh falla → cierra sesión. Mapea errores al formato `{statusCode, codigo, mensaje, requestId}` en un tipo `ErrorApi`. Timeouts (15 s) y sin reintentos automáticos en `POST` no idempotentes.
4. **WatermelonDB (`core/db/`):** esquema (versionado, con migraciones) y modelos:
   - `municipios`, `categorias`, `pois` (con `ubicacion_lat`, `ubicacion_lng`, `horario_json`, `contacto_json`, `activo`, `actualizado_en`), `rutas`, `ruta_paradas`, `itinerarios`, `itinerario_paradas`, `cola_sync`, `meta_sync` (claves como `pois_actualizado_desde`).
   - `cola_sync`: `op_id`, `tipo`, `datos_json`, `ocurrido_en`, `estado` (`pendiente|enviando|ok|rechazada`), `intentos`, `ultimo_error`, `creado_en`.
5. **Repositorios locales (`core/db/repositorios/`)**: `PoiLocalRepo`, `ItinerarioLocalRepo`, `ColaSyncRepo`, `CatalogoLocalRepo` — única puerta de entrada a WatermelonDB.
6. **Conectividad (`core/conectividad`):** hook `useConectividad()` con `@react-native-community/netinfo`; evento "recuperó señal".
7. **Motor de sync (`core/sync/sync.service.ts`):**
   - **Pull de catálogo:** `GET /pois?actualizadoDesde=<meta>&page…` hasta agotar; upsert por `id`; `activo=false` → borrar local; guarda el nuevo `actualizadoDesde`. Igual para `/categorias` y `/municipios`.
   - **Push:** toma `cola_sync` pendientes (≤ 100), `POST /sync`, actualiza estados por `opId` (`ok/duplicada` → `ok`; `rechazada` → `rechazada` con motivo visible).
   - **Disparadores:** arranque con sesión, recuperación de conexión, pull-to-refresh, y tras encolar. **Backoff exponencial** 2 s…5 min; un solo sync a la vez (candado).
   - **Encolar:** `ColaSyncRepo.encolar(tipo, datos)` genera `opId` **UUID v4 en el cliente**.
8. **Pruebas:** refresh concurrente (3 peticiones con token expirado → 1 solo `POST /auth/refresh`); pull incremental y borrado de inactivos; push con respuesta mixta; reintento tras fallo de red sin duplicar (mismo `opId`); candado de sync.

## 5. Reglas obligatorias
- La UI **lee primero de local**; nunca bloquea esperando red.
- `opId` se genera una sola vez por operación y se conserva en los reintentos.
- Ningún token en logs ni en AsyncStorage.

## 6. Criterios de aceptación
- [ ] Pruebas de la tarea 8 verdes.
- [ ] Con el modo avión, la app abre y lee el catálogo ya sincronizado.
- [ ] Un 401 con refresh inválido cierra sesión limpiamente.
- [ ] Lint de fronteras verde.

## 7. Prohibido
Consultar la BD del servidor directamente · guardar contraseñas · reintentar operaciones con un `opId` nuevo.
