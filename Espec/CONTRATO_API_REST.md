# CONTRATO — API REST de Trekko

Fuente: spec §3.6.3 (Tabla 17). **Back y front se construyen contra este archivo.** Un endpoint marcado **(C)** es *complementario*: no aparece en la Tabla 17 pero es indispensable para cumplir un RF; está permitido solo porque figura aquí.
Convenciones generales (camelCase, paginación, errores, roles): ver `01_REGLAS_GLOBALES…` §4.

## 1. Errores

```json
{ "statusCode": 409, "codigo": "CUPO_LLENO", "mensaje": "El grupo ya no tiene lugares disponibles.", "requestId": "…", "detalles": [] }
```

| Código HTTP | `codigo` típicos |
|---|---|
| 400 | `DATOS_INVALIDOS` (con `detalles`), `ITINERARIO_IMPOSIBLE`, `RUTA_INVALIDA` |
| 401 | `NO_AUTENTICADO`, `TOKEN_EXPIRADO`, `CREDENCIALES_INVALIDAS` (genérico: no revela si el correo existe) |
| 403 | `SIN_PERMISO`, `CUENTA_SUSPENDIDA` |
| 404 | `NO_ENCONTRADO` |
| 409 | `CORREO_EN_USO` (mensaje genérico), `CUPO_LLENO`, `OPERACION_DUPLICADA`, `ESTADO_INVALIDO` |
| 429 | `DEMASIADAS_PETICIONES` |

## 2. Endpoints Fase 1

| ID | Método y ruta | Rol | Módulo | Paso |
|---|---|---|---|---|
| E-01 | `POST /auth/register` | Público | auth | BACK-02 |
| E-02 | `POST /auth/login` | Público | auth | BACK-02 |
| E-03 | `POST /auth/refresh` | Refresh token | auth | BACK-02 |
| E-04 | `POST /auth/logout` **(C)** | Autenticado | auth | BACK-02 |
| E-05 | `GET /perfil` **(C)** | Autenticado | auth | BACK-02 |
| E-06 | `PATCH /perfil` **(C)** | Autenticado | auth | BACK-02 |
| E-07 | `POST /perfil/modo` **(C)** | Autenticado | auth | BACK-02 |
| E-08 | `GET /pois/cercanos` | Explorador | catalogo | BACK-03 |
| E-09 | `GET /pois/:id` | Explorador | catalogo | BACK-03 |
| E-10 | `GET /pois` **(C)** (listado y delta para caché local) | Explorador | catalogo | BACK-03 |
| E-11 | `GET /categorias`, `GET /municipios` **(C)** | Explorador | catalogo | BACK-03 |
| E-12 | `POST /itinerarios/generar` | Explorador | rutas | BACK-04 |
| E-13 | `POST /itinerarios` **(C)** (guardar) | Explorador | rutas | BACK-04 |
| E-14 | `GET /itinerarios`, `GET /itinerarios/:id`, `DELETE /itinerarios/:id` **(C)** | Explorador (dueño) | rutas | BACK-04 |
| E-15 | `GET /rutas`, `GET /rutas/:id` **(C)** | Explorador | rutas | BACK-04 |
| E-16 | `POST /rutas` | Creador (y `admin` para Originals) | rutas | BACK-04 |
| E-17 | `PATCH /rutas/:id` **(C)** (solo borrador) | Creador (dueño) / admin | rutas | BACK-04 |
| E-18 | `POST /rutas/:id/publicar` | Creador (dueño) / admin | rutas | BACK-04 |
| E-19 | `POST /rutas/:id/copiar` **(C)** (crea itinerario desde una ruta) | Explorador | rutas | BACK-04 |
| E-20 | `POST /sync` | Autenticado | common/sync | BACK-06 |
| E-21 | `PATCH /negocios/:id` | Anfitrión (dueño) | anfitriones | BACK-05 |
| E-22 | `POST /pagos/webhook` **(C)** | Público (firma verificada) | anfitriones | BACK-05 |
| E-23 | `GET /health` **(C)** | Público | common | BACK-01 |
| A-01 | `POST /admin/negocios`, `PATCH /admin/negocios/:id` **(C)** | admin | anfitriones | BACK-05 |
| A-02 | `POST /admin/pois`, `PATCH /admin/pois/:id`, `DELETE /admin/pois/:id` (baja lógica) **(C)** | admin | catalogo | BACK-05 |
| A-03 | `POST /admin/negocios/:id/suscripciones` **(C)** (crea enlace de pago) | admin | anfitriones | BACK-05 |
| A-04 | `POST /admin/suscripciones/:id/activar`, `/cancelar` **(C)** | admin | anfitriones | BACK-05 |

## 3. Endpoints Fase 2

| ID | Método y ruta | Rol | Módulo | Paso |
|---|---|---|---|---|
| E-30 | `POST /checkins` **(C)** | Explorador | gamificacion | BACK-08 |
| E-31 | `POST /resenas` | Explorador | gamificacion | BACK-08 |
| E-32 | `GET /mapa-personal`, `GET /insignias/mias`, `GET /ranking` **(C)** | Explorador | gamificacion | BACK-08 |
| E-33 | `GET /recompensas` **(C)**, `POST /canjes`, `POST /canjes/validar` | Explorador / Comercio (anfitrión dueño de la recompensa) | gamificacion | BACK-08 |
| E-34 | `POST /grupos` | Creador / Explorador | social | BACK-09 |
| E-35 | `GET /grupos`, `GET /grupos/:id`, `GET /grupos/mios` **(C)** | Explorador | social | BACK-09 |
| E-36 | `POST /grupos/:id/unirse` (idempotente, controla cupo) | Explorador | social | BACK-09 |
| E-37 | `POST /grupos/:id/salir`, `DELETE /grupos/:id` **(C)** | Miembro / Organizador | social | BACK-09 |
| E-38 | `GET /grupos/:id/secreto` **(C)** (solo miembros) | Miembro | social | BACK-09 |
| E-39 | `POST /viajes/:id/iniciar` | Organizador | social | BACK-10 |
| E-40 | `GET /viajes/:id`, `POST /viajes/:id/cancelar`, `POST /viajes/:id/eventos/:eventoId/completar` **(C)** | Miembro / Organizador | social | BACK-10 |
| E-41 | `POST /viajes/:id/calificaciones`, `GET /usuarios/:id/karma` **(C)** | Miembro | social | BACK-09 |
| E-42 | `POST /dispositivos` **(C)** (token push) | Autenticado | social | BACK-10 |
| E-43 | `POST /reportes` | Autenticado | auth | BACK-11 |
| E-44 | `POST /verificacion` **(C)**, `GET /verificacion/estado` **(C)** | Autenticado | auth | BACK-11 |
| E-45 | `POST /negocios/:id/reclamar`, `POST /negocios/:id/reclamar/confirmar`, `GET /negocios/mios` **(C)** | Anfitrión | anfitriones | BACK-11 |
| E-46 | `GET/POST/PATCH/DELETE /negocios/:id/promociones` **(C)** | Anfitrión (dueño, Premium) | anfitriones | BACK-11 |
| E-47 | `GET /negocios/:id/estadisticas` **(C)** | Anfitrión (dueño) | anfitriones | BACK-11 |
| E-48 | `GET /analitica/indicadores` | institucional | analitica | BACK-11 |
| A-10 | `GET /admin/reportes`, `POST /admin/reportes/:id/validar` **(C)** | admin | auth | BACK-11 |
| A-11 | `GET /admin/verificaciones`, `POST /admin/verificaciones/:id/resolver` **(C)** | admin | auth | BACK-11 |

## 4. Payloads clave

### 4.1 Auth

```ts
// POST /auth/register
{ nombre: string /*2-80*/, correo: string, password: string /*8-72 bytes*/, aceptaAviso: true }
// 201 (y POST /auth/login → 200, POST /auth/refresh → 200)
{ usuario: { id, nombre, correo, roles: Rol[], modoActivo: Rol, perfilVerificado: boolean },
  tokens: { accessToken: string, refreshToken: string, accessExpiraEn: string /*ISO*/ } }
// POST /auth/login  { correo, password }
// POST /auth/refresh { refreshToken }   POST /auth/logout { refreshToken }
// POST /perfil/modo { modo: Rol }  (solo roles que el usuario ya posee)
```
JWT de acceso: `{ sub: usuarioId, roles, modo, iat, exp }`. El refresh es un token **opaco** (no JWT).

### 4.2 POIs

```ts
// GET /pois/cercanos?lat&lng&radioM=5000(max 50000)&categoria=slug(,slug)&costoMax&municipioId&abiertoEn=ISO&orden=distancia|destacado&page&limit
PoiResumen = {
  id, nombre, categoria: { id, slug, nombre }, municipioId,
  ubicacion: { lat, lng }, costoPromedio, distanciaM?, abiertoAhora: boolean | null,
  destacado: boolean, puntuacionVisible: number | null, numResenas: number,
  enlaces: { whatsapp?: string /*https://wa.me/…*/, llamada?: string /*tel:…*/ }
}
// GET /pois/:id
PoiDetalle = PoiResumen & {
  descripcion, direccion, horario: Horario, contacto: { telefono?, whatsapp?, sitioWeb? },
  fotos: string[], duracionVisitaMin, puntoSeguro: boolean,
  negocio: { id, nombre, verificado } | null,
  resenas: { total: number, items: ResenaPublica[] }   // F1: total 0, items []
}
// GET /pois?municipioId&categoria&costoMax&q&actualizadoDesde=ISO&page&limit
//   Con actualizadoDesde devuelve también POIs inactivos (activo:false) para que el cliente los borre de su caché.
Horario = { lun: [string,string][], mar: …, mie: …, jue: …, vie: …, sab: …, dom: …, excepciones?: { [fecha: string]: [string,string][] } }
// [] = cerrado. 24 h = [["00:00","24:00"]]
```

### 4.3 Itinerarios

```ts
// POST /itinerarios/generar
{ municipioId: number, fecha: string /*YYYY-MM-DD*/, duracionHoras: number /*1-14*/, presupuestoMxn: number,
  intereses: string[] /*slugs de categoría*/, incluirHospedaje?: boolean, permitirDividirDias?: boolean, horaInicio?: string /*HH:mm, def. 09:00*/ }
ItinerarioPropuesta = {
  parametros: {…lo enviado…},
  dias: [{ dia: number, fecha: string, paradas: Parada[] }],
  costoTotalMxn: number, duracionTotalMin: number,
  desglose: { accesos, comida, compras, hospedaje, traslados },
  dentroDePresupuesto: boolean,
  advertencias: { codigo: 'PRESUPUESTO_EXCEDIDO'|'DURACION_EXCEDIDA'|'SIN_CANDIDATOS'|'POI_CERRADO_OMITIDO', mensaje: string }[],
  sugerencias: { tipo: 'ALTERNATIVA_ECONOMICA'|'DIVIDIR_DOS_DIAS', mensaje: string, poiId?: string }[],
  origen: 'servidor' | 'local', datosActualizadosA?: string
}
Parada = { orden, poiId, nombre, categoriaSlug, horaLlegada: 'HH:mm', duracionVisitaMin, costoMxn,
           traslado: { km: number, min: number, costoMxn: number } | null }
// POST /itinerarios (guardar; idempotente por opId: repetido → 200 con el mismo recurso)
{ opId: string, titulo?: string, propuesta: ItinerarioPropuesta }   → 201 Itinerario { id, titulo, …propuesta, creadoEn }
```

### 4.4 Rutas

```ts
// POST /rutas  (CreateRutaDto)
{ titulo: string /*3-120*/, descripcion?: string /*≤1000*/, municipioId: number,
  paradas: { poiId: string, orden: number, duracionVisitaMin: number /*5-480*/ }[] /*2-15, orden consecutivo desde 1, poiId sin repetir*/ }
Ruta = { id, tipo: 'original'|'comunitaria', estado: 'borrador'|'validada'|'publicada', titulo, descripcion, municipioId,
         autor: { id, nombre }, costoEstimado, duracionMin, usos, paradas: RutaParada[], publicadaEn? }
// POST /rutas/:id/publicar → valida (≥2 paradas, POIs activos, horarios compatibles, distancia entre paradas ≤ 80 km, campos completos)
//   → borrador→validada→publicada en una transacción. Error de validación: 400 RUTA_INVALIDA con detalles.
```

### 4.5 Sync (resumen; detalle en `CONTRATO_WS_SYNC_TOTP.md`)

```ts
POST /sync { operaciones: { opId: string, tipo: string, datos: object, ocurridoEn: string }[] /*≤100*/ }
→ 200 { resultados: { opId, estado: 'ok'|'duplicada'|'rechazada', motivo?: string, resultado?: object }[] }
```

### 4.6 Fase 2 (formas principales)

```ts
POST /checkins   { opId, poiId, ubicacion: {lat,lng}, precisionM, ocurridoEn?, metodo: 'gps' }  → 201 { checkIn, puntosGanados, insigniasNuevas[] }
POST /resenas    { opId, checkInId, criterios: { precio, servicio, accesibilidad, facilidadLlegada } /*1-5*/, texto?: string /*≤1000*/, fotos?: string[] /*≤4 claves de objeto subidas*/ }
POST /canjes     { recompensaId } → 201 { id, codigo: string /*contenido del QR*/, expiraEn }
POST /canjes/validar { codigo } → 200 { valido: true, recompensa, usuarioAlias } | 409 CANJE_USADO
POST /grupos     { rutaId, titulo, cupo /*≥2*/, fecha: ISO, puntoEncuentro: { lat, lng, nombre }, toleranciaMin?: 5-60, recurrente?: boolean, recurrencia?: { dias: number[] /*0-6*/, hora: 'HH:mm' } }
POST /grupos/:id/unirse  → 200 { estado: 'unido'|'ya_era_miembro' } | 409 CUPO_LLENO
POST /reportes   { reportadoId, grupoId?, viajeId?, motivo, gravedad: 'leve'|'grave', descripcion }
GET /analitica/indicadores?municipioId&desde&hasta  → agregados con umbral mínimo k=5 (no devuelve celdas con < 5 usuarios distintos)
```
EOF
cat > CONTRATO_WS_SYNC_TOTP.md <<'EOF'
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
EOF