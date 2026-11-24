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
