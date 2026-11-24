# BACK-10 — Gateway WebSocket y Viaje Activo (Fase 2)

**Fase:** 2 · **Depende de:** BACK-09 · **Spec origen:** §3.6.3 (Tabla 18), §3.6.4, §3.8.2 (Tabla 23), §3.8.3, §3.8.4 (Tabla 25), §3.10, RF-12, RF-13, RF-14 · **CU:** 08, 09

## 1. Objetivo
Viaje Activo en tiempo real: sala por grupo, temporizador de tolerancia, publicación de eventos, votación con mayoría, alertas, asistencia con código rotativo (en línea y sincronizada), notificaciones push y reconciliación offline.

## 2. Prerrequisitos
BACK-09 aprobado. Leer `contratos/CONTRATO_WS_SYNC_TOTP.md` §2, §3 y §4 **completos**.

## 3. Archivos permitidos
`apps/api/src/modules/social/{gateway,viaje,notificaciones,sync}/**`, `apps/api/test/viaje.e2e-spec.ts`, `infra/nginx/trekko.conf` (solo verificar `/ws`).

## 4. Estructura exacta

```
modules/social/
├─ viaje/
│  ├─ controllers/viajes.controller.ts          # E-39, E-40, E-42
│  ├─ services/{viaje-activo.service.ts, maquina-estados.ts, tolerancia.service.ts, votacion.service.ts, motor-tiempos.service.ts, asistencia.service.ts}
│  ├─ repositories/{viaje-activo.repository.ts, evento-viaje.repository.ts, voto.repository.ts, asistencia.repository.ts, dispositivo-push.repository.ts}
│  ├─ entities/…
│  └─ dto/…
├─ gateway/
│  ├─ viaje.gateway.ts                           # namespace /viaje
│  ├─ ws-auth.guard.ts                           # valida JWT en handshake
│  └─ ws-eventos.ts                              # constantes de nombres de eventos (Tabla 18)
├─ notificaciones/{notificaciones.service.ts, expo-push.adapter.ts}
└─ sync/{asistencia.sync-handler.ts, voto.sync-handler.ts}
```

## 5. Tareas

1. **`maquina-estados.ts`:** una tabla `Record<EstadoViaje, Record<Disparador, EstadoViaje>>` con **exactamente** las transiciones de la Tabla 25 / `CONTRATO_WS_SYNC_TOTP §4`, y la función única `transicionar(viaje, disparador)`. Cualquier otra → `409 ESTADO_INVALIDO`. **Ningún otro lugar del código cambia `viaje_activo.estado`.** Pruebas: matriz completa (todas las combinaciones válidas pasan; todas las inválidas fallan).
2. **REST:** `POST /viajes/:id/iniciar` (solo organizador; `programado→en_espera`), `GET /viajes/:id`, `POST /viajes/:id/cancelar`, `POST /viajes/:id/eventos/:eventoId/completar` (organizador; avanza al siguiente evento, o `finalizado` si era el último), `POST /dispositivos` (registra token push).
3. **Gateway (`/ws`, namespace `/viaje`):** autenticación en el handshake con el JWT (`auth.token`); `grupo:unirse` solo para miembros activos → ack con estado actual; eventos de Tabla 18 con los payloads exactos del contrato, **todos con `servidorAhora`**. Desconexión/reconexión: al reunirse de nuevo se reenvía el estado actual.
4. **`ToleranciaService`:** al iniciar el viaje fija `tolerancia_vence_en` en BD y agenda el temporizador; **sobrevive a reinicios** (al arrancar re-agenda los pendientes; además un cron cada 30 s revisa vencidos como red de seguridad). Al vencer: ≥ 1 llegada → `en_espera→activo` (publica el primer evento, `viaje:evento_actual`); 0 llegadas → `cancelado` (libera cupos, notifica). Envía `viaje:alerta` tipo `TOLERANCIA` (p. ej. a mitad y a 1 min del vencimiento).
5. **Llegada (`viaje:llegada` y handler `asistencia.registrar`):** `AsistenciaService` valida —**con `ocurridoEn`**— (a) código TOTP válido (ventana ±1) **o** ubicación a ≤ 150 m del punto de encuentro, y siempre (b) distancia ≤ 150 m al punto de encuentro, (c) `ocurridoEn` dentro de `[fecha − 30 min, fecha + tolerancia + 30 min]`, (d) el usuario es miembro activo. Registra `asistencia` (único por `(viaje, usuario)` y por `op_id`). Emite `social.llegada.confirmada` (para que gamificación cree el check-in). Rechazos con los motivos estandarizados.
6. **`MotorTiemposService`:** al publicar cada evento calcula ETA (distancia del POI × `ITINERARIO_FACTOR_RUTA` ÷ `ITINERARIO_VELOCIDAD_KMH`); si el POI estará **cerrado** a esa hora (usa `HorarioService` expuesto por `CatalogoService`) o el grupo lleva retraso > 15 min → `activo→en_votacion` con propuesta (`saltar`, o `alternativa` con `CatalogoService.alternativasCercanas`) y `viaje:alerta` (`HORARIO_BLOQUEADO`/`RETRASO`/`ALTERNATIVA`).
7. **`VotacionService`:** votan miembros con asistencia confirmada; `voto:emitir` (PK evita doble voto; segundo → ack `{ok:false,codigo:'OPERACION_DUPLICADA'}`); cierra al alcanzar mayoría matemática o a los 60 s; resultado → `voto:resultado` y `en_votacion→activo` aplicando la decisión (`omitido` o reemplazo del POI) y avanzando. **Empate → `pendiente_desempate`**: el organizador decide con `voto:desempate`. Sin votos al cierre → se mantiene el plan.
8. **Finalización:** al concluir el último evento → `finalizado`, emite `viaje:finalizado` y `social.viaje.finalizado`, y de inmediato `finalizado→resenado` (abre reseñas y calificaciones; push a todo el grupo).
9. **Offline (handlers `asistencia.registrar` y `voto.emitir`):** reconcilian lo hecho sin señal. Un voto offline solo se acepta si su evento sigue en votación; si no → `rechazada: ESTADO_INVALIDO`. El líder que decidió cambios sin señal sincroniza `completar` de eventos con `ocurridoEn`.
10. **Notificaciones (`NotificacionesService`):** puerto + adaptador Expo Push (host fijo del proveedor); tokens de `dispositivo_push`; no incluye datos personales en el texto; reintentos limitados y limpieza de tokens inválidos.
11. **Pruebas:** matriz de estados completa; flujo feliz E2E con 3 clientes Socket.IO (iniciar → llegadas → tolerancia vence → eventos → votación → finalizar → reseñado); tolerancia con 0 llegadas → cancelado; cliente sin token / no miembro → conexión rechazada; **dos votos del mismo usuario → un solo conteo**; empate → desempate del organizador; llegada con código inválido, fuera de ventana y a 400 m → rechazadas con su motivo; sync de asistencia duplicada → `duplicada`; reinicio del servidor durante la tolerancia → el viaje arranca igual; no se puede votar en un viaje `programado`.

## 6. Reglas obligatorias
- Toda transición pasa por `transicionar()`.
- El servidor es la fuente de verdad del reloj (`servidorAhora`); los temporizadores del cliente son solo visuales.
- La ubicación de los usuarios no se retransmite al resto del grupo (solo "presente/ausente").

## 7. Criterios de aceptación
- [ ] Todas las pruebas de la tarea 11 verdes.
- [ ] Eventos y payloads idénticos a `CONTRATO_WS_SYNC_TOTP §2`.
- [ ] Prueba de reinicio con tolerancia pendiente pasa.
- [ ] `lint:arch` verde.

## 8. Prohibido
Cambiar `estado` fuera de `maquina-estados.ts` · permitir votar sin asistencia confirmada · confiar en la hora del cliente · transmitir coordenadas entre miembros.
EOF
cat > BACK-11_Moderacion_Verificacion_Portal_Analitica_F2.md <<'EOF'
# BACK-11 — Moderación, verificación de identidad, portal self-service y analítica (Fase 2)

**Fase:** 2 · **Depende de:** DB-07, BACK-10 · **Spec origen:** §2.6, §3.3, §3.7.3, §5.1, §5.2, §5.3 (Tabla 44), §6.3 (Tabla 49), RF-18, RF-19, RF-20, RF-21 · **CU:** 11, 12

## 1. Objetivo
Cerrar la Fase 2: reportes con sanciones progresivas, Perfil Verificado, portal self-service del anfitrión (reclamo, promociones, estadísticas por plan) e indicadores anonimizados para entidades institucionales.

## 2. Prerrequisitos
DB-07 migrada; almacén de objetos S3-compatible disponible; BACK-10 aprobado.

## 3. Archivos permitidos
`apps/api/src/modules/auth/**` (reportes, sanciones, verificación), `apps/api/src/modules/anfitriones/**` (portal), `apps/api/src/modules/analitica/**`, `apps/api/src/common/storage/**` (cliente de almacén), `apps/api/test/{moderacion,portal,analitica}.e2e-spec.ts`.

## 4. Estructura nueva

```
modules/auth/{controllers/{reportes.controller.ts, verificacion.controller.ts, admin-moderacion.controller.ts}, services/{reportes.service.ts, sanciones.service.ts, verificacion.service.ts, purga-verificacion.job.ts}, repositories/{reporte,sancion,verificacion-identidad}.repository.ts, entities/…}
modules/anfitriones/{controllers/{portal-negocios.controller.ts, promociones.controller.ts, estadisticas.controller.ts}, services/{reclamo-negocio.service.ts, promociones.service.ts, estadisticas.service.ts}, repositories/{promocion,poi-evento}.repository.ts}
modules/analitica/{index.ts, analitica.module.ts, controllers/analitica.controller.ts, services/indicadores.service.ts, repositories/indicadores.repository.ts}
common/storage/{storage.port.ts, s3.adapter.ts}
```

## 5. Tareas

1. **Reportes (`POST /reportes`, E-43):** DTO (`reportadoId`, `grupoId?`, `viajeId?`, `motivo`, `gravedad`, `descripcion` ≤ 1000); no a uno mismo; un reporte abierto por `(reportante, reportado, viaje)`; rate limit.
2. **Sanciones progresivas (`SancionesService`, Tabla 44):** al **validar** un reporte (`POST /admin/reportes/:id/validar`, admin): 1.º validado de conducta leve → `advertencia`; 2.º → `suspension` 7 días; 3.º → `suspension` 30 días + marca para revisión de perfil; gravedad `grave` (acoso, violencia) → `bloqueo` inmediato (`usuario.estado='bloqueada'`, **conserva registros**). Valores en `config/sanciones.config.ts` (editable). Emite `auth.sancion.aplicada`. Al vencer una suspensión, el job diario restaura `estado='activa'`.
3. **Verificación de identidad (E-44):** `POST /verificacion` recibe `tipoDocumento` y devuelve una **URL prefirmada de subida** (PUT, caducidad 5 min) hacia una clave `identidad/<usuarioId>/<uuid>` con **cifrado del lado del servidor del almacén**; registra `verificacion_identidad` con `fecha_purga = ahora + 30 días`. Admin resuelve (`/admin/verificaciones/:id/resolver`): `aprobada` → `perfil_verificado=true`. **`purga-verificacion.job.ts`** (diario): borra el objeto del almacén, pone `objeto_clave=NULL`, `estado='purgada'` al llegar `fecha_purga`. La imagen **nunca** pasa por el api ni se loguea.
4. **Reclamo de negocio (E-45):** `POST /negocios/:id/reclamar` envía un **código de 6 dígitos al WhatsApp registrado de la ficha** (vía puerto `MensajeriaPort`; en dev, stub que lo escribe en log local), válido 10 min, 5 intentos máx.; `…/confirmar {codigo}` → `negocio.propietario_id` y `verificado=true` y `AuthService.otorgarRol(usuarioId,'anfitrion')`. Un negocio ya verificado no se puede reclamar (409). `GET /negocios/mios`.
5. **Promociones (E-46):** CRUD limitado al dueño y **solo con plan Premium activo** (`AnfitrionesService.obtenerPlan`); fechas coherentes; máx. 3 activas.
6. **Estadísticas (E-47):** vistas, contactos (WhatsApp/llamada), guardados y reseñas desde `poi_evento`/`gamificacion`; plan **gratuito = básicas** (totales del mes), **Premium = completas** (series por día, comparación con el mes anterior). Registro de eventos: `catalogo` emite o escribe `poi_evento` mediante un método público de `anfitriones` (`registrarEventoPoi`), sin PII.
7. **Analítica (E-48):** `@Roles('institucional')`; consulta **solo** las vistas `vw_analitica_*`; parámetros `municipioId`, `desde`, `hasta` (máx. 12 meses); respuesta agregada; **celdas con < 5 usuarios distintos no se devuelven** (ya garantizado por la vista; test de regresión). Sin ningún identificador de persona.
8. **Colectivo verificado:** campo/flag administrativo (`admin`) para insignia comunitaria (§5.1); solo bandera, sin lógica adicional.
9. **Pruebas:** escala de sanciones paso a paso (advertencia → 7 d → 30 d) y bloqueo inmediato por gravedad; usuario suspendido no puede unirse/crear grupos; purga elimina el objeto y limpia `objeto_clave`; reclamo con código correcto/incorrecto/vencido; no se puede reclamar un negocio ajeno verificado; promoción sin Premium → 403; estadísticas básicas vs. completas; analítica con 4 usuarios en una celda → no aparece; con 5 → aparece; un explorador llamando a analítica → 403.

## 6. Reglas obligatorias
- Imágenes de identidad: cifradas, conservadas lo mínimo, sin pasar por logs.
- Analítica nunca devuelve datos individuales.
- Bloqueos conservan registros para requerimientos legales.

## 7. Criterios de aceptación
- [ ] Todas las pruebas de la tarea 9 pasan.
- [ ] E-43…E-48, A-10, A-11 en Swagger conforme a contrato.
- [ ] Revisión OWASP repetida para los endpoints nuevos (reporte en `qa/`).
- [ ] `lint:arch` verde.

## 8. Prohibido
Guardar documentos de identidad en la BD o en logs · consultas de analítica sobre tablas base · aplicar sanciones sin validación de un admin (salvo la regla explícita de gravedad, que también pasa por validación).
EOF