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
