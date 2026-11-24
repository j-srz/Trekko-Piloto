# BACK-04 — Módulo Rutas e itinerarios (generador)

**Fase:** 1 · **Depende de:** BACK-03, DB-04 · **Spec origen:** §3.5.3, §3.5.4, §3.8.2 (Tabla 22), §3.8.5, §3.9 (Tablas 26–27), RF-05, RF-06, RF-07, RF-09 (base), RNF-01 · **CU:** 04, 05 (base)

## 1. Objetivo
(a) Núcleo puro del generador en `packages/itinerario-core` (compartido con la app para operar **sin conexión**), (b) servicio `ItinerarioGenerator` en Nest que lo alimenta con datos de PostGIS, (c) guardado/consulta de itinerarios, (d) ciclo de vida de rutas (Trekko Originals en F1; Creadores en F2 con el mismo código).

## 2. Prerrequisitos
`GET /pois/cercanos` operativo; tablas de DB-04 migradas; seed de Originals.

## 3. Archivos permitidos
`packages/itinerario-core/**`, `apps/api/src/modules/rutas/**`, `apps/api/test/rutas.e2e-spec.ts`, `packages/contracts/**` (tipos de itinerario/ruta).

## 4. Estructura exacta

```
packages/itinerario-core/
├─ src/{index.ts, generar-itinerario.ts, puntuacion.ts, horario.ts, distancia.ts, tipos.ts, config.ts}
└─ __tests__/

modules/rutas/
├─ index.ts                  # exporta RutasService (obtenerRutaPublicada, existeRuta), eventos
├─ rutas.module.ts
├─ controllers/{rutas.controller.ts, itinerarios.controller.ts}
├─ dto/{create-ruta.dto.ts, actualizar-ruta.dto.ts, generar-itinerario.dto.ts, guardar-itinerario.dto.ts, ruta.dto.ts, itinerario.dto.ts}
├─ services/{rutas.service.ts, ruta-validador.service.ts, itinerario-generator.service.ts, itinerarios.service.ts, calculo-ruta.service.ts}
├─ repositories/{ruta.repository.ts, itinerario.repository.ts}
├─ entities/{ruta.entity.ts, ruta-poi.entity.ts, itinerario.entity.ts, itinerario-parada.entity.ts}
├─ sync/itinerario.sync-handler.ts        # handlers 'itinerario.guardar' y 'itinerario.eliminar' (se registran en BACK-06)
└─ events/{ruta-publicada.event.ts, ruta-usada.event.ts}
```

## 5. Núcleo `itinerario-core` (puro, sin I/O)

**Firma:**
```ts
generarItinerario(entrada: {
  prefs: { fecha, duracionMin, presupuestoMxn, intereses: string[], horaInicio: string, incluirHospedaje: boolean, permitirDividirDias: boolean },
  candidatos: PoiCandidato[],   // {id,nombre,categoriaSlug,tipoGasto,lat,lng,costo,duracionVisitaMin,horario,puntuacionVisible|null}
  config: { tarifaKm, velocidadKmh, factorRuta, pesos: { interes, calificacion, costo }, mediaGlobalC }
}): ItinerarioPropuesta
```
**Algoritmo (§3.9.2) — respetar el orden:**
1. **Selección:** descarta candidatos cerrados en `fecha` (usa `horario.ts`, mismo contrato que el servidor) y los que no coinciden con `intereses` (si `intereses` vacío, todos).
2. **Puntuación:** `score = w_interes·1 + w_calificacion·(puntuacion/5, o C/5 si null) + w_costo·(1 − min(costo/presupuesto, 1))`. Pesos por defecto `0.4 / 0.4 / 0.2`.
3. **Ordenamiento:** el POI de mayor puntuación abre; los siguientes por **vecino más cercano** (haversine × `factorRuta`) respetando ventanas de horario (la hora de llegada simulada debe caer en un intervalo abierto y permitir `duracionVisitaMin` completa).
4. **Cálculo:** `costoTotal = Σ costo POIs + Σ(km × tarifaKm) + hospedaje`; `duracionTotal = Σ duracionVisita + Σ(km ÷ velocidadKmh × 60)`. El traslado de ida desde el punto de partida no se cuenta; solo entre paradas (igual que el ejemplo de la Tabla 27).
5. **Ajuste:** mientras `costoTotal > presupuesto`: sustituir la parada de menor puntuación por una candidata libre más barata de **su misma categoría**; si no hay, eliminarla. Recalcular. Si aun así excede → devolver lo mejor posible con `advertencias: PRESUPUESTO_EXCEDIDO` y `sugerencias: ALTERNATIVA_ECONOMICA` (A1).
6. **Duración (A2):** si no cabe en `duracionMin`: recortar paradas de menor puntuación; si `permitirDividirDias`, el excedente va a `dia 2` (fecha+1, revalidando horarios) y se agrega `sugerencias: DIVIDIR_DOS_DIAS`; si no, `advertencias: DURACION_EXCEDIDA`.
7. **Hospedaje:** solo si `incluirHospedaje` o hay 2 días: se agrega el hospedaje de mejor score que quepa en el presupuesto, con costo por noche.
8. Sin candidatos → `dias: []`, `advertencias: SIN_CANDIDATOS`.
9. Redondeo de dinero a centavos; horas en `HH:mm`.

El núcleo **no** importa nada de Node/Nest/RN; todas las constantes llegan por `config`. Sale con `origen:'servidor'|'local'` fijado por quien lo llama.

## 6. Tareas

1. **`itinerario-core`** con las funciones anteriores y pruebas unitarias (Jest, sin BD):
   - **Caso Tabla 27**: fixture de 6 POIs (plaza 0 $/60 min, mirador $50/90, comida $250/75, artesanías $150/45, 40 km totales de traslado) con `tarifaKm=5`, `velocidadKmh=40`: costo total = **$650** y duración total = **5 h 30 min** (330 min) con tolerancia exacta de centavos.
   - Presupuesto $800 vs $300 (sustitución/eliminación); POI cerrado en domingo omitido; `permitirDividirDias`; sin candidatos; determinismo (misma entrada → misma salida); 100 candidatos en < 100 ms.
2. **`ItinerarioGenerator`** (Nest): consulta candidatos con `CatalogoService` (por `municipioId`, intereses; pre-filtro por día de la semana en SQL/servicio), construye `config` desde `ConfigService` (`ITINERARIO_*`, D-05) y llama al núcleo; fija `origen:'servidor'`. **Meta: ≤ 3 s (§1.4)** — test con 500 POIs.
3. **`POST /itinerarios/generar` (E-12)** (no persiste). DTO según contrato; `duracionHoras` 1–14; `presupuestoMxn` > 0; fecha no anterior a hoy.
4. **Guardado:** `POST /itinerarios` (E-13) idempotente por `(usuario_id, opId)`; `GET /itinerarios`, `GET /itinerarios/:id`, `DELETE /itinerarios/:id` (baja lógica) — solo dueño (si no, 404). Handler `sync` `itinerario.guardar`/`.eliminar` reutiliza `ItinerariosService` (se registra en BACK-06).
5. **Rutas:** `RutasService`:
   - `crear` (borrador; `tipo='original'` si el actor es `admin`, `'comunitaria'` si es `creador`), `actualizar` (solo `borrador`, solo dueño o admin), `publicar`, `obtener`, `listar`.
   - `CreateRutaDto`: 2–15 paradas, `orden` consecutivo desde 1, `poiId` sin repetir, `duracionVisitaMin` 5–480 (mapea a validadores de `class-validator`, incluidos validadores propios).
   - `CalculoRutaService` calcula costo y duración con **PostGIS** (`ST_Distance` geography entre paradas consecutivas × `ITINERARIO_FACTOR_RUTA`, misma fórmula del núcleo). Test de paridad: diferencia núcleo vs. PostGIS < 1 %.
   - `RutaValidadorService` (al publicar): ≥ 2 paradas, POIs activos (`CatalogoService.existenPoisActivos`), horarios compatibles (existe al menos un día de la semana en que todos abren), distancia entre paradas consecutivas ≤ 80 km, campos completos. Falla → 400 `RUTA_INVALIDA` con `detalles`.
   - `publicar` (E-18): en **una transacción** `borrador → validada → publicada` (+`publicada_en`). Emite `rutas.ruta.publicada` **tras el commit**. Dueño o admin; otro usuario → 404.
   - Autorización de creación: `@Roles('creador','admin')`. En F1 solo `admin` posee ese flujo; el rol `creador` se otorga en BACK-08 (no cambiar este código después).
   - `GET /rutas` (solo `publicada`, filtros `municipioId`, `tipo`) y `GET /rutas/:id` (publicada, o propia en cualquier estado).
   - `POST /rutas/:id/copiar` (E-19): crea un itinerario a partir de la ruta (misma lógica de costo), incrementa `usos` y emite `rutas.ruta.usada` (una vez por usuario y ruta).
6. **Pruebas e2e:** generar (feliz, presupuesto bajo, sin candidatos), guardar idempotente (mismo `opId` → mismo id), acceso a itinerario ajeno → 404, ciclo completo de ruta (crear → publicar), ruta con 1 parada → 400, editar publicada → 409 `ESTADO_INVALIDO`.

## 7. Reglas obligatorias
- La lógica de generación vive **solo** en `itinerario-core`; el servicio Nest no reimplementa nada.
- `estado_ruta` solo cambia por `RutasService` (transacción) — nunca por UPDATE suelto.
- El generador no escribe en BD.

## 8. Criterios de aceptación
- [ ] Caso Tabla 27 exacto ($650 / 330 min) en pruebas del núcleo.
- [ ] Generación ≤ 3 s con 500 POIs; núcleo < 100 ms con 100 candidatos.
- [ ] E-12…E-19 conformes a contrato y documentados en Swagger.
- [ ] Paridad núcleo/PostGIS < 1 %.
- [ ] `itinerario-core` sin imports de Node/RN (verificado por lint).
- [ ] `lint:arch` verde.

## 9. Prohibido
Duplicar el algoritmo en el servicio · añadir estados nuevos a `estado_ruta` · optimizadores externos (heurística de la spec: vecino más cercano).
EOF
cat > BACK-05_Anfitriones_Panel_Interno_y_Suscripcion.md <<'EOF'
# BACK-05 — Módulo Portal de anfitriones: panel interno y suscripción (Fase 1)

**Fase:** 1 · **Depende de:** BACK-03 · **Spec origen:** §1.5, §3.3 (Tabla 14), §6.3 (Tablas 49–50), RF-08, D-09, D-11 · **CU:** 11 (alta)

## 1. Objetivo
Que **el equipo** dé de alta negocios y POIs, importe POIs por CSV, genere enlaces de pago de la suscripción Premium ($200 MXN/mes), reciba la confirmación de pago y mantenga el posicionamiento destacado. Sin portal self-service (Fase 2).

## 2. Prerrequisitos
BACK-03 aprobado; usuario `admin` sembrado.

## 3. Archivos permitidos
`apps/api/src/modules/anfitriones/**`, `apps/api/src/modules/catalogo/controllers/admin-poi.controller.ts` y `catalogo/services/admin-catalogo.service.ts` (endpoints A-02), `apps/api/src/cli/**`, `apps/api/test/anfitriones.e2e-spec.ts`.

## 4. Estructura exacta

```
modules/anfitriones/
├─ index.ts                       # exporta AnfitrionesService (obtenerPlan, esPropietario) y eventos
├─ anfitriones.module.ts
├─ controllers/{admin-negocios.controller.ts, negocios.controller.ts, pagos-webhook.controller.ts}
├─ dto/{crear-negocio.dto.ts, actualizar-negocio.dto.ts, crear-suscripcion.dto.ts}
├─ services/{negocios.service.ts, suscripciones.service.ts, suscripcion-vencimiento.job.ts}
├─ pasarela/{pasarela-pago.port.ts, mercadopago.adapter.ts, stub.adapter.ts, pasarela.factory.ts}
├─ repositories/{negocio.repository.ts, suscripcion.repository.ts}
├─ entities/{negocio.entity.ts, suscripcion.entity.ts}
└─ events/{suscripcion-activada.event.ts, suscripcion-vencida.event.ts}
apps/api/src/cli/import-pois.command.ts
```

## 5. Tareas

1. **Negocios (A-01):** `POST /admin/negocios` y `PATCH /admin/negocios/:id` (`@Roles('admin')`). Datos: nombre, categoría, contacto (`telefono`, `whatsapp` E.164 validado). Todo cambio se registra en la bitácora (log estructurado con `adminId`).
2. **POIs administrables (A-02)** en `catalogo`: `POST/PATCH/DELETE /admin/pois` (baja lógica `activo=false`). Validaciones: coordenadas dentro del bounding box del estado de Aguascalientes (configurable), `horario` con el esquema de `CONTRATO_API_REST §4.2`, `negocio_id` existente. El `destacado` **no** se acepta en el DTO.
3. **Importador CSV** `pnpm --filter api cli:import-pois <archivo.csv> [--dry-run]`: columnas `nombre,categoria_slug,municipio_clave,lat,lng,costo_promedio,duracion_visita_min,horario_json,telefono,whatsapp,direccion,descripcion`. Valida fila por fila, reporta errores con número de línea, inserta en transacción, idempotente por `(nombre, municipio, ubicación)`. `--dry-run` no escribe.
4. **Puerto de pasarela:**
```ts
interface PasarelaPagoPort {
  crearEnlacePago(input: { suscripcionId: string; montoMxn: number; descripcion: string; correoNegocio?: string }): Promise<{ url: string; referencia: string }>;
  verificarWebhook(headers: Record<string,string>, rawBody: Buffer): { valido: boolean; referencia?: string; estadoPago?: 'aprobado'|'rechazado'|'pendiente' };
}
```
   Adaptador por defecto Mercado Pago (D-11) y `StubAdapter` para desarrollo/pruebas. `pasarela.factory.ts` elige por `PASARELA`. Las llamadas salientes usan **solo hosts fijos del proveedor** (sin URLs del usuario — A10).
5. **Suscripciones (A-03/A-04):**
   - `POST /admin/negocios/:id/suscripciones` crea registro `estado=pendiente`, `plan=premium`, monto 200, genera `enlace_pago` y `referencia_pasarela`.
   - `POST /admin/suscripciones/:id/activar` (confirmación manual, p. ej. pago por transferencia): `estado=activa`, `vigencia_inicio=hoy`, `vigencia_fin=+1 mes`; en **una transacción**; emite `anfitriones.suscripcion.activada` tras el commit. `…/cancelar` análogo.
   - **Una sola activa por negocio** (índice `uq_suscripcion_activa_por_negocio`): intento duplicado → 409.
6. **Webhook `POST /pagos/webhook` (E-22):** `@Publico()` pero **verifica la firma** (`PASARELA_WEBHOOK_SECRET`) con comparación en tiempo constante sobre el cuerpo crudo; idempotente por `referencia_pasarela`; pago aprobado → misma activación que la tarea 5. Firma inválida → 401 sin detalles; cuerpo enorme (> 100 KB) → 400.
7. **Job diario** (`@nestjs/schedule`, `suscripcion-vencimiento.job.ts`): marca `vencida` las suscripciones con `vigencia_fin < hoy` y emite `anfitriones.suscripcion.vencida`.
8. **`PATCH /negocios/:id` (E-21):** `@Roles('anfitrion')` + verificación de **propiedad** (`propietario_id = usuario actual`); campos limitados a contacto y nombre. Otro usuario → 403/404. (El portal completo es Fase 2.)
9. **Pruebas:** alta de negocio y POI por admin (y 403 para un explorador); importador con CSV bueno y con filas malas; activación manual → el POI queda `destacado` (por evento, vía `catalogo`); vencimiento quita `destacado`; webhook con firma válida/ inválida/ repetido; doble suscripción activa → 409; `PATCH /negocios/:id` por no-dueño → rechazo.

## 6. Reglas obligatorias
- Ningún endpoint `/admin/*` sin `@Roles('admin')`.
- `anfitriones` **no** escribe en `poi`; solo emite eventos (la actualización de `destacado` la hace `catalogo`).
- El webhook nunca confía en el cuerpo sin verificar firma.
- Sin UI web (D-09): la operación del equipo es por Swagger + CLI.

## 7. Criterios de aceptación
- [ ] A-01…A-04, E-21, E-22 conformes a contrato y en Swagger.
- [ ] CLI procesa un CSV de 300 filas en una sola transacción y reporta errores por línea.
- [ ] Activar/vencer suscripción cambia `destacado` solo vía evento.
- [ ] Firma de webhook inválida nunca activa nada.
- [ ] `lint:arch` verde.

## 8. Prohibido
Escribir `poi.destacado` desde este módulo · procesar pagos entre viajeros y prestadores (la pasarela solo cobra la suscripción) · guardar datos de tarjeta.
EOF