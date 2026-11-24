# CONTRATO — WebSocket, Sync offline, TOTP y máquinas de estado

Fuente: spec §3.6.3 (Tabla 18), §3.6.4, §3.8.4 (Tabla 25), §3.9.1.

## 1. Sync offline (`POST /sync`) — Fase 1 y 2

Request/response: ver `CONTRATO_API_REST.md` §4.5.

| Regla | Detalle |
|---|---|
| Idempotencia | `opId` es PK en `sync_operacion`. Si existe → `estado: "duplicada"` con el resultado original; **no** se reprocesa |
| Orden | Se procesan en el orden recibido; **cada operación en su propia transacción**; el fallo de una no revierte las demás |
| Límite | ≤ 100 operaciones por request; cuerpo ≤ 1 MB |
| Validación | Cada `tipo` tiene su `datos` DTO validado en servidor; un tipo desconocido → `rechazada` con `motivo: "TIPO_DESCONOCIDO"` |
| Tiempo | El servidor usa `ocurridoEn` (no la hora de recepción) para ventanas TOTP y horarios. Si `ocurridoEn` está en el futuro (> 5 min de tolerancia) → `rechazada` |
| Registro | Handlers se registran con `@SyncHandler('tipo')` desde cada módulo; el controlador no conoce la lógica |

| `tipo` | Fase | Módulo dueño | `datos` | Resultado |
|---|---|---|---|---|
| `itinerario.guardar` | 1 | rutas | `{ titulo?, propuesta }` | `{ itinerarioId }` |
| `itinerario.eliminar` | 1 | rutas | `{ itinerarioId }` | `{}` |
| `checkin.registrar` | 2 | gamificacion | `{ poiId, ubicacion, precisionM, metodo: 'gps' }` | `{ checkInId, puntosGanados }` |
| `resena.crear` | 2 | gamificacion | `{ checkInOpId \| checkInId, criterios, texto?, fotos? }` | `{ resenaId }` |
| `asistencia.registrar` | 2 | social | `{ viajeId, codigo, ubicacion }` | `{ asistenciaId }` |
| `voto.emitir` | 2 | social | `{ viajeId, eventoId, opcion }` | `{}` (rechazada si el evento ya no está en votación) |

Motivos de rechazo estandarizados: `CODIGO_INVALIDO`, `FUERA_DE_VENTANA`, `UBICACION_LEJANA` (> 100 m del POI o > 150 m del punto de encuentro), `PRECISION_INSUFICIENTE`, `DESPLAZAMIENTO_IMPOSIBLE`, `LIMITE_DIARIO`, `ESTADO_INVALIDO`, `NO_ES_MIEMBRO`, `TIPO_DESCONOCIDO`, `DATOS_INVALIDOS`.

**Cola local del cliente** (`cola_sync`): estados `pendiente → enviando → ok | rechazada(conflicto)`; reintentos con backoff exponencial (2 s, 4 s, 8 s … máx 5 min); una `rechazada` no se reintenta: se muestra al usuario.

## 2. WebSocket (Socket.IO sobre WSS)

- Ruta de conexión: `/ws` (Nginx hace upgrade). Namespace: `/viaje`.
- Autenticación: `io(url, { auth: { token: <accessToken> } })`. El servidor valida el JWT en el handshake; si expira, el cliente reconecta con token nuevo.
- Sala: `grupo:<grupoId>`. Solo miembros activos pueden entrar.
- Todos los eventos del servidor incluyen `servidorAhora` (ISO) para que el cliente corrija el desfase de reloj del temporizador.
- Cada evento cliente→servidor responde con *ack*: `{ ok: true, … }` o `{ ok: false, codigo, mensaje }`.

| Evento | Dirección | Payload |
|---|---|---|
| `grupo:unirse` | C→S | `{ grupoId }` → ack `{ ok, estadoViaje, eventoActual, miembrosPresentes[] }` |
| `viaje:llegada` | C→S | `{ viajeId, ubicacion: {lat,lng}, codigo?: string, opId }` |
| `viaje:evento_actual` | S→grupo | `{ viajeId, estado, evento: { id, orden, poiId, nombre, horaEstimada }, siguiente?, servidorAhora }` |
| `viaje:alerta` | S→grupo | `{ viajeId, tipo: 'TOLERANCIA'|'RETRASO'|'HORARIO_BLOQUEADO'|'ALTERNATIVA', mensaje, toleranciaVenceEn?, propuesta?: { tipo: 'saltar'|'alternativa', poiAlternativoId? }, votacionCierraEn?, servidorAhora }` |
| `voto:emitir` | C→S | `{ viajeId, eventoId, opcion: 'a_favor'|'en_contra', opId }` |
| `voto:desempate` **(C)** | C→S (solo organizador) | `{ viajeId, eventoId, opcion }` — solo válido tras `voto:resultado` con `empate: true` |
| `voto:resultado` | S→grupo | `{ viajeId, eventoId, aFavor, enContra, empate: boolean, aplicado: 'saltar'|'alternativa'|'mantener'|'pendiente_desempate', siguienteEventoId? }` |
| `viaje:finalizado` | S→grupo | `{ viajeId, resumen: { eventosCompletados, eventosOmitidos }, reseñasAbiertas: true }` |

Reglas de votación: votan los miembros con asistencia confirmada; 1 voto por usuario y evento (`PK(evento_id, usuario_id)`); la votación cierra al alcanzar mayoría matemática o al vencer `votacionCierraEn` (60 s); empate → decide el organizador.

## 3. TOTP de asistencia sin conexión (§3.6.4)

| Parámetro | Valor |
|---|---|
| Algoritmo | RFC 6238: HMAC-SHA1, 6 dígitos |
| Paso (`period`) | 180 s |
| Secreto | 20 bytes aleatorios por grupo; en BD cifrado con AES-256-GCM (`iv‖tag‖ciphertext`, clave `GRUPO_SECRET_KEY`); al cliente se entrega en **base32** vía `GET /grupos/:id/secreto` solo a miembros |
| Validación en servidor | Código válido en ventana ±1 paso, evaluada con `ocurridoEn` del registro (no con la hora de recepción) |
| Segundo factor | Distancia entre `ubicacion` registrada y el punto de encuentro ≤ 150 m, y `ocurridoEn` dentro de `[fecha − 30 min, fecha + tolerancia + 30 min]` |
| UI | **Solo el organizador ve el código**; los demás lo escriben. Un código compartido por fuera no basta sin la verificación de ubicación del servidor |
| Cliente y servidor | Deben usar **la misma implementación de referencia** (pruebas cruzadas con vectores de RFC 6238) |

## 4. Máquina de estados del Viaje Activo (Tabla 25)

Estados: `programado`, `en_espera`, `activo`, `en_votacion`, `finalizado`, `resenado`, `cancelado`.

| Desde | Hacia | Disparador | Acción del sistema |
|---|---|---|---|
| programado | en_espera | Organizador llama `POST /viajes/:id/iniciar` | Abre sala, notifica, fija `tolerancia_vence_en = now + toleranciaMin` |
| en_espera | activo | Vence la tolerancia con ≥ 1 llegada | Inicia con quienes confirmaron; publica primer evento |
| en_espera | cancelado | Vence la tolerancia sin llegadas | Libera cupos y notifica |
| activo | en_votacion | Horario bloqueado, retraso o solicitud | Propone alternativa y abre votación |
| en_votacion | activo | Mayoría (o desempate del organizador) | Aplica resultado y avanza |
| activo | finalizado | Último evento concluido | Cierra el viaje; emite `social.viaje.finalizado` |
| finalizado | resenado | Inmediato tras finalizar | Abre reseñas y calificaciones entre pares; push a todo el grupo |
| programado | cancelado | Organizador cancela | Notifica a los miembros |

Cualquier otra transición → `409 ESTADO_INVALIDO` (REST) o ack `{ ok:false, codigo:'ESTADO_INVALIDO' }` (WS). **Toda transición pasa por una única función** `ViajeActivoService.transicionar(viaje, disparador)`.

## 5. Estados de ruta (Tabla 26)

`borrador → validada → publicada`. Las etapas 5–7 del ciclo de vida (con grupo, en ejecución, calificada) **no** son valores de `estado_ruta`: se derivan de `grupo`/`viaje_activo`/`resena`.

## 6. Estados de grupo

`abierto → lleno → en_viaje → finalizado`; `cancelado` desde abierto/lleno. `lleno` se calcula cuando `miembros_count = cupo`; vuelve a `abierto` si alguien sale. Grupos recurrentes: tras `finalizado` de una ocurrencia, el grupo pasa a `abierto` con la siguiente `fecha`.
