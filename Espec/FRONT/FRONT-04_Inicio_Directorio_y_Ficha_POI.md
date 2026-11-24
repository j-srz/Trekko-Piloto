# FRONT-04 — Inicio, directorio de POIs y ficha con contacto directo

**Fase:** 1 · **Depende de:** FRONT-03, BACK-03 · **Spec origen:** §3.11 (Tabla 29), §1.6, RF-03, RF-04, RNF-01, RNF-02 · **CU:** 03

## 1. Objetivo
Pantalla **Inicio** (buscador, filtros por costo/categoría/tiempo, destacados) y **ficha de POI** con horario, costo, ubicación y botones de **WhatsApp** y **Llamar**, todo leyendo primero de la base local.

## 2. Archivos permitidos
`apps/mobile/app/(tabs)/inicio.tsx`, `apps/mobile/app/poi/[id].tsx`, `apps/mobile/src/features/{catalogo,inicio}/**`, `apps/mobile/src/core/i18n/es.ts`.

## 3. Estructura

```
features/catalogo/{components/{PoiTarjeta,FiltrosPoi,ChipsCategoria,EstadoAbierto,BotonesContacto}.tsx, hooks/{usePois,usePoi,useFiltros}.ts, services/{catalogo.service.ts,horario.ts,enlaces.ts}, types.ts}
features/inicio/{components/{RutasDestacadas,Buscador}.tsx, hooks/useInicio.ts}
```

## 4. Tareas

1. **Datos:** `usePois(filtros)` consulta `PoiLocalRepo` (observables de WatermelonDB) y dispara un sync en segundo plano si hay red; **la lista aparece de inmediato** desde local (RNF-01).
2. **Inicio:** buscador (`q`), filtros (categoría multi, costo máximo, tiempo disponible), sección **"Trekko Originals"** (aparece desde H3; hasta entonces oculta), listado con `FlatList` virtualizada, estado vacío y banner **"Sin conexión — datos del <fecha de último sync>"**.
3. **`horario.ts`:** **misma lógica que el servidor** (formato de `CONTRATO_API_REST §4.2`); reutilizar `packages/contracts` para el tipo. `EstadoAbierto` muestra "Abierto ahora / Cerrado / Horario no disponible" con **texto + icono** (no solo color). Test con los mismos casos que `HorarioService` del backend (domingo, 24 h, excepciones, medianoche).
4. **Ficha `poi/[id]`:** nombre, categoría, descripción, fotos, horario por día, costo promedio, dirección, puntuación visible con **número de reseñas** (transparencia; "Sin reseñas aún" en F1), botón **Cómo llegar** (abre la app de mapas con coordenadas), y `BotonesContacto`.
5. **Contacto directo:** `WhatsApp` abre `https://wa.me/<numero>` y `Llamar` abre `tel:`; usa los `enlaces` del API o los construye en `enlaces.ts` desde `contacto` (validando E.164). Si el dispositivo no puede abrir el enlace → mensaje claro. Botones ocultos si falta el dato. Cada contacto, estando en línea, encola `poi_evento` solo en F2 (no implementar ahora).
6. **Accesibilidad:** cada tarjeta es un solo elemento accesible con etiqueta completa ("Fonda La Esquina, restaurante, abierto ahora, 120 pesos, a 1.2 km"); foco lógico; fuente escalable sin recortes.
7. **Pruebas:** filtros combinados sobre datos locales; render sin red; horario (casos); botones de contacto abren el URL correcto (mock de `Linking`); estado vacío; snapshot de accesibilidad de la tarjeta.

## 5. Criterios de aceptación
- [ ] En modo avión la lista y las fichas funcionan con datos previamente sincronizados.
- [ ] Filtros por costo, categoría y municipio operan sobre la BD local.
- [ ] WhatsApp y Llamar abren el enlace correcto.
- [ ] Lista de 300 POIs fluida (sin caída de frames visible).
- [ ] Pruebas y lint verdes.

## 6. Prohibido
Llamar a la API desde componentes (solo vía servicios/hooks) · mostrar calificación sin el número de reseñas · estados solo por color.
