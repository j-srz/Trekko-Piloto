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
