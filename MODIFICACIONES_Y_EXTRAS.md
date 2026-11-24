# Modificaciones y extras — Trekko

## Estado de esta entrega

La versión funcional existente se publicó primero en [Trekko-Piloto](https://github.com/j-srz/Trekko-Piloto):

- `master`: snapshot monorepo inicial, commit `5733557`.
- `archive/trekko-api`: historial independiente del API hasta `7cd1e44`.
- `archive/trekko-mobile`: historial independiente del móvil hasta `706579e`.
- La raíz incorpora `.gitignore`; no se incluyeron `.env.local`, `node_modules`, `dist`, `coverage` ni `.expo`.

Los cambios locales preexistentes del API se conservaron y se incluyeron antes del snapshot: datos de muestra para Aguascalientes, Pueblos Mágicos y cinco rutas; notas sobre datos estimados; y la guía de arranque y Postman en `trekko-api/docs/PUESTA_EN_MARCHA_Y_POSTMAN.md`.

## Implementación presente en la base publicada

- **API:** NestJS con configuración validada, autenticación JWT y refresh token rotatorio, filtros y limitación de solicitudes, health checks, catálogo de POIs/municipios, generación/consulta de rutas, migraciones PostgreSQL/PostGIS, almacenamiento S3 y pruebas unitarias/e2e.
- **Móvil:** Expo Router, pantallas de autenticación, SecureStore para tokens, cliente API, caché de lecturas con AsyncStorage, pantallas de inicio/mapa/rutas y pestaña de grupos aún provisional.
- **Especificaciones:** los archivos disponibles están bajo `Espec/`.

## Brechas detectadas frente a `Espec`

1. **Paquete de especificaciones reparado:** varios pasos, `PROGRESO.md` y el contrato WebSocket/Sync estaban concatenados en otros Markdown como texto de comandos heredoc. Se separaron 12 documentos en los nombres previstos y se retiraron únicamente los delimitadores/comandos de envoltura, conservando el contenido de cada sección. Siguen sin estar `Trekko_Especificaciones.md`, FRONT-10, FRONT-11 y QA-01.
2. **Estructura:** las reglas describen `apps/api` y `apps/mobile`; el proyecto publicado conserva `trekko-api` y `trekko-mobile`. También faltan los workspaces `packages/contracts` y `packages/itinerario-core`.
3. **Contrato API:** existen endpoints con nombres distintos a los pactados, por ejemplo `/pois/nearby` en vez de `/pois/cercanos`, `/routes` en vez de `/rutas`, `/routes/generate` en vez de `/itinerarios/generar` y `/auth/me` en vez de `/perfil`. No están implementados todos los endpoints de Sync ni las funciones sociales/de gamificación de Fase 2.
4. **Persistencia móvil:** se usa AsyncStorage para caché de lecturas; no está incorporado WatermelonDB ni la cola de sincronización exigida. SecureStore sí protege los tokens.
5. **Fase 2:** no están los módulos backend de gamificación/social ni las pantallas completas de grupos y Viaje Activo; la pestaña de grupos muestra un estado provisional.
6. **Base de datos:** DB-01 requiere que el paso base no cree tablas de negocio, pero el historial actual ya contiene migraciones de auth, POIs y rutas. Se confirmó reiniciar la base local para construir la secuencia especificada; todavía no se ha borrado ningún volumen ni dato local.

## Verificación de la base

- API: `npm run lint`, `npm run build` y `npm test` correctos (15 suites, 43 pruebas).
- Móvil: `npm run lint` no pudo terminar porque falta un binding nativo opcional de `unrs-resolver` en `node_modules`; no se reinstalaron dependencias ni se modificó el lockfile. Las pruebas móviles no se ejecutaron después de ese fallo.
- El chequeo inicial del diff del monorepo señaló dos líneas vacías al final de archivos móviles preexistentes; se conservaron sin cambios.

## Siguiente paso requerido

El trabajo continúa en el orden de dependencias de `Espec`, con estructura y rutas API exactas. La especificación original, FRONT-10/11 y QA-01 no están disponibles; cualquier requisito que dependa de ellos quedará señalado, no inventado. No se afirma que la aplicación ya cumpla íntegramente la especificación.
