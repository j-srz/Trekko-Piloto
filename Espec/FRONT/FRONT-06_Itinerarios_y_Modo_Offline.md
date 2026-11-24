# FRONT-06 — Itinerarios con presupuesto y modo offline

**Fase:** 1 · **Depende de:** FRONT-05, BACK-04, BACK-06 · **Spec origen:** §3.8.2 (Tabla 22), §3.8.5, §3.9, RF-05, RF-06, RF-07, RNF-02 · **CU:** 04 · **Hito:** H3

## 1. Objetivo
Formulario de generación, resultado con costo/duración, guardado, consulta sin conexión, y **generación local** cuando no hay red usando el mismo núcleo que el servidor.

## 2. Archivos permitidos
`apps/mobile/app/itinerario/**`, `apps/mobile/app/ruta/[id].tsx`, `apps/mobile/src/features/itinerarios/**`, `apps/mobile/src/features/inicio/components/RutasDestacadas.tsx`.

## 3. Estructura

```
features/itinerarios/{components/{FormularioItinerario,ResultadoItinerario,ParadaItem,DesgloseCosto,AlertasItinerario}.tsx,
  hooks/{useGenerarItinerario,useItinerarios,useGuardarItinerario}.ts,
  services/{itinerarios.service.ts, generador-local.service.ts}, types.ts}
```

## 4. Tareas

1. **Formulario:** municipio, fecha (no pasada), duración en horas (1–14), presupuesto en MXN (> 0), intereses (chips de categoría), opciones "incluir hospedaje" y "permitir dividir en dos días". Validación local; botón deshabilitado mientras genera.
2. **`itinerarios.service.ts` — decisión online/offline:**
   - **Con red:** `POST /itinerarios/generar` → `origen:'servidor'`.
   - **Sin red o fallo de red:** `generador-local.service.ts` llama a `generarItinerario()` de **`packages/itinerario-core`** con candidatos de `PoiLocalRepo` y la `config` por defecto de D-05 (valores sincronizados desde un endpoint de configuración cuando exista; hasta entonces constantes en `core/config`). Marca `origen:'local'` y `datosActualizadosA` = fecha del último sync, y muestra el aviso "Calculado con datos de <fecha>".
3. **Resultado:** lista de paradas (hora, duración, costo, traslado), **desglose** (accesos, comida, compras, hospedaje, traslados), costo total y duración total, `dentroDePresupuesto` con texto + icono. `AlertasItinerario` muestra `advertencias` y `sugerencias` (A1: alternativas más económicas; A2: dividir en dos días) con acción para aplicarlas (regenera con el parámetro correspondiente).
4. **Guardar:** `useGuardarItinerario` guarda **siempre primero en local** (`ItinerarioLocalRepo`), y **encola** `itinerario.guardar` en `cola_sync` con `opId` UUID v4. Con red, dispara sync inmediato. El itinerario aparece en "Mis itinerarios" de inmediato con indicador "Pendiente de sincronizar" (texto + icono) hasta recibir `ok`.
5. **Mis itinerarios:** lista local, detalle sin conexión, eliminar (encola `itinerario.eliminar`).
6. **Rutas Trekko Originals:** `RutasDestacadas` en Inicio (datos de `/rutas`, sincronizados a local), pantalla `ruta/[id]` con paradas, costo estimado y botón **"Usar esta ruta"** (E-19 online; offline encola y calcula local).
7. **Paridad servidor/cliente:** prueba que, con el mismo conjunto de POIs y parámetros, el resultado del núcleo local coincide con una respuesta registrada del servidor (fixture compartido en `packages/itinerario-core/__fixtures__`).
8. **Pruebas:** generar con red (mock) y sin red (local); caso Tabla 27 → $650 / 5 h 30; guardado offline → cola → sync → estado `ok`; reintento no duplica; presupuesto bajo muestra sugerencias; accesibilidad del resultado.

## 5. Criterios de aceptación
- [ ] En modo avión se genera, guarda y consulta un itinerario.
- [ ] Al volver la red, el itinerario aparece en el servidor **una sola vez**.
- [ ] El núcleo local = núcleo servidor (prueba de paridad).
- [ ] El resultado siempre muestra costo total y duración.
- [ ] Pruebas y lint verdes.

## 6. Prohibido
Reimplementar el algoritmo en la app · guardar solo en servidor · generar un `opId` nuevo al reintentar.
