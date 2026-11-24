# BACK-06 — Sincronización offline (`POST /sync`)

**Fase:** 1 (base) · extendida en Fase 2 · **Depende de:** BACK-04, DB-04 · **Spec origen:** §3.6.4 (Figura 9), §3.12, RF-07, RF-14, RNF-02, RNF-10

## 1. Objetivo
Un único endpoint idempotente que recibe operaciones hechas sin conexión, las despacha a **handlers registrados por cada módulo** y responde un resultado por operación. En Fase 1 solo maneja itinerarios.

## 2. Prerrequisitos
`ItinerariosService` operativo (BACK-04); tabla `sync_operacion` (DB-04). Leer `contratos/CONTRATO_WS_SYNC_TOTP.md` §1.

## 3. Archivos permitidos
`apps/api/src/common/sync/**`, `apps/api/src/modules/rutas/sync/itinerario.sync-handler.ts`, `apps/api/test/sync.e2e-spec.ts`.

## 4. Estructura exacta

```
common/sync/
├─ sync.module.ts
├─ sync.controller.ts            # POST /sync
├─ sync.service.ts               # orquesta: idempotencia + transacción por operación
├─ sync-registry.ts              # mapa tipo → handler (descubierto por decorador)
├─ sync-handler.decorator.ts     # @SyncHandler('tipo')
├─ sync-handler.interface.ts     # { ejecutar(usuarioId, datos, ctx): Promise<ResultadoSync> }
├─ dto/sync-request.dto.ts
└─ repositories/sync-operacion.repository.ts
```

## 5. Tareas

1. **DTO:** `operaciones` array 1–100; cada una `{ opId (uuid v4), tipo (string ≤ 60), datos (objeto), ocurridoEn (ISO, no más de 5 min en el futuro) }`. Cuerpo máximo 1 MB.
2. **Registro de handlers:** `@SyncHandler('itinerario.guardar')` sobre una clase `Injectable`; `SyncRegistry` los descubre en el arranque (`DiscoveryService`). Dos handlers con el mismo tipo → el arranque falla.
3. **`SyncService.procesar(usuarioId, operaciones)`:** para cada operación, **en orden**:
   1. Si `opId` ya existe en `sync_operacion` (mismo usuario) → resultado `duplicada` con el `resultado`/`estado` original; **no** reejecuta. Si existe de **otro** usuario → `rechazada: DATOS_INVALIDOS`.
   2. Tipo desconocido → `rechazada: TIPO_DESCONOCIDO` (se registra).
   3. Abrir transacción → ejecutar handler → insertar en `sync_operacion` (`ok` o `rechazada`+motivo) → commit. Excepción inesperada → rollback de **esa** operación y `rechazada: ERROR_INTERNO` (sin detalles); continuar con las demás.
4. **Handlers F1** (en `modules/rutas/sync/`): `itinerario.guardar` y `itinerario.eliminar` llaman a `ItinerariosService` (misma validación que el REST; `opId` se propaga como `op_id` del itinerario).
5. **Respuesta:** `{ resultados: [{ opId, estado, motivo?, resultado? }] }` — 200 aunque haya rechazos individuales.
6. **Throttle** específico (p. ej. 30 req/min por usuario).
7. **Pruebas:**
   - 3 operaciones válidas → 3 `ok`.
   - **Reenvío del mismo lote** → `duplicada` ×3, sin filas nuevas de itinerario.
   - Lote mixto (1 válida, 1 tipo desconocido, 1 con datos inválidos) → solo la válida persiste.
   - `opId` de otro usuario → rechazada.
   - 101 operaciones → 400.
   - Un handler que lanza error no afecta a las siguientes.
   - Concurrencia: dos requests simultáneos con el mismo `opId` → una `ok` y la otra `duplicada`/conflicto controlado (PK en `sync_operacion`).

## 6. Reglas obligatorias
- Cada operación en su propia transacción; el servicio de sync **no** conoce la lógica de negocio.
- Los módulos de Fase 2 se registran añadiendo handlers, **sin modificar** `SyncService`.
- El tiempo de negocio se toma de `ocurridoEn`, nunca de la hora de recepción.

## 7. Criterios de aceptación
- [ ] Todas las pruebas de la tarea 7 pasan.
- [ ] Reenvío idempotente demostrado.
- [ ] Añadir un handler nuevo no requiere tocar `common/sync`.
- [ ] `lint:arch` verde.

## 8. Prohibido
Procesar el lote en una sola transacción · usar `Date.now()` para decidir ventanas de negocio · reejecutar operaciones duplicadas.
EOF
cat > BACK-07_Seguridad_Transversal_Docker_CI.md <<'EOF'
# BACK-07 — Seguridad transversal, observabilidad, Docker, CI/CD y respaldos

**Fase:** 1 · **Depende de:** BACK-02, 03, 05 (y se reverifica tras BACK-04/06) · **Spec origen:** §3.7, §3.7.1 (Tabla 20), §3.10 (Tabla 28), §3.12, RNF-03, RNF-08 · **Hito:** H2 (producción desde el Mes 3)

## 1. Objetivo
Dejar el backend desplegable en VPS con TLS, respaldos probados, CI/CD y la revisión OWASP Top 10 ejecutada.

## 2. Prerrequisitos
Endpoints de H2 completos y con pruebas verdes.

## 3. Archivos permitidos
`infra/**`, `apps/api/Dockerfile`, `.github/workflows/**`, `apps/api/src/main.ts` (solo endurecimiento), `apps/api/test/seguridad.e2e-spec.ts`, `qa/` (solo reportes).

## 4. Tareas

1. **Dockerfile multi-etapa** del api: build → imagen final no-root, solo dependencias de producción, `HEALTHCHECK` a `/health`, sin `.env` dentro de la imagen.
2. **`infra/docker/docker-compose.prod.yml`:** servicios `api`, `db` (postgis, sin puerto público), `nginx`, `certbot`; red interna; volúmenes nombrados; `restart: unless-stopped`; secretos por variables de entorno del servidor.
3. **Nginx** (`infra/nginx/trekko.conf`): TLS (redirección 80→443), TLS ≥ 1.2, HSTS, límites de tamaño de cuerpo (1 MB; uploads F2 en ruta propia), `proxy_pass` al api, **upgrade WebSocket en `/ws`** (aunque el gateway llegue en Fase 2), cabeceras `X-Forwarded-*`, ocultar versión. Certbot con renovación automática.
4. **CI (`ci.yml`)** en cada PR: `lint`, `lint:arch`, `test` (con servicio PostGIS), `build`, `npm audit --omit=dev` (falla en *high/critical*). **CD (`deploy.yml`)** en `main`: construir imagen versionada (SHA), publicarla y desplegarla en el VPS por SSH con rollback a la imagen anterior si el `HEALTHCHECK` falla.
5. **Respaldos:** `infra/scripts/backup.sh` (`pg_dump` comprimido y **cifrado**, retención 7 días, cron diario) y `infra/scripts/restore-test.sh` (restaura el último respaldo en una BD temporal y corre consultas de verificación; programado **mensual**). Documentar en `infra/README.md`.
6. **Observabilidad:** logs estructurados con `requestId`; registro de intentos fallidos de login y de acciones `/admin/*`; `GET /health` conectado a un monitor de uptime externo; alertas al equipo (correo/Telegram) por caída y por tasa de 5xx.
7. **Endurecimiento:** cabeceras helmet verificadas, CORS con lista estricta, puertos expuestos solo 80/443, SSH por llave, firewall; variables de entorno rotables.
8. **Revisión OWASP Top 10 (Tabla 20)** → `qa/reporte-owasp-<fecha>.md`. Cada categoría con prueba automática o manual **reproducible** (ver `qa/QA-01…` §3) y resultado.
9. **Prueba de carga básica con k6** (`infra/k6/pois-cercanos.js`): 50 usuarios simultáneos sobre `GET /pois/cercanos`, p95 < 1 s (RNF-01).

## 5. Reglas obligatorias
- Ningún secreto en el repositorio, en imágenes ni en logs.
- La BD **nunca** es accesible desde fuera del contenedor/red interna.
- El despliegue falla de forma segura (rollback automático).

## 6. Criterios de aceptación
- [ ] `docker compose -f docker-compose.prod.yml up` levanta todo con TLS válido (o autofirmado en staging).
- [ ] Respaldo cifrado generado y **restaurado con éxito** una vez (evidencia en `qa/`).
- [ ] CI falla con una dependencia con vulnerabilidad *high* simulada.
- [ ] Reporte OWASP con las 10 categorías y sin hallazgos críticos abiertos.
- [ ] k6: p95 < 1 s con 50 usuarios.
- [ ] `nmap`/equivalente: solo 22, 80 y 443 abiertos.

## 7. Prohibido
Contenedores como root · `0.0.0.0:5432` · `cors: *` · desplegar sin pasar CI · claves en `docker-compose.yml`.
EOF