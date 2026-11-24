# FRONT-05 — Mapa

**Fase:** 1 · **Depende de:** FRONT-04 · **Spec origen:** §3.1, §3.11 (Tabla 29), §3.6.2 (Figura 7), RF-03, RNF-01, RNF-04 · **Riesgo:** D-14

## 1. Objetivo
Pestaña **Mapa** con pines por categoría, POIs cercanos, ficha rápida y contacto, usando Google Maps SDK, con caché local inmediata.

## 2. Archivos permitidos
`apps/mobile/app/(tabs)/mapa.tsx`, `apps/mobile/src/features/mapa/**`, `apps/mobile/app.config.ts` (solo claves de Maps por secretos de EAS).

## 3. Estructura

```
features/mapa/{components/{MapaPois,PinCategoria,HojaPoi,ControlesFiltro}.tsx, hooks/{useUbicacion,usePoisCercanos}.ts, services/{ubicacion.service.ts,cercania.service.ts}}
```

## 4. Tareas

1. **Mapa:** `react-native-maps` con provider Google; región inicial en el municipio activo; **agrupación (clustering)** de pines cuando hay muchos.
2. **Pines:** icono **y** forma/etiqueta por categoría (no solo color), con `accessibilityLabel`. Los destacados llevan marca visual con texto ("Destacado").
3. **Ubicación (`ubicacion.service.ts`):** permiso **foreground únicamente**, solicitado al primer uso con explicación; si se niega, el mapa funciona centrado en el municipio. Nunca ubicación en segundo plano.
4. **Cercanía (flujo de Figura 7):** (1) pintar **primero** los POIs de la BD local dentro del radio; (2) si hay red, `GET /pois/cercanos` con posición, radio y filtros; (3) upsert local y refrescar pines. La distancia local usa haversine de `packages/itinerario-core` (misma función que el servidor).
5. **Hoja inferior (`HojaPoi`):** nombre, abierto/cerrado, costo, distancia, botones **WhatsApp / Llamar / Ver ficha**.
6. **Sin conexión (D-14):** pines, lista e itinerarios funcionan; el mapa base depende del caché del SDK. Mostrar `Banner` "Mapa limitado sin conexión" cuando no haya red. **No** prometer mapas descargables hasta decidir D-14 con el humano.
7. **Pruebas:** pines desde local sin red; filtros; permiso denegado (fallback al municipio); toque en pin abre hoja; accesibilidad de pines.

## 5. Criterios de aceptación
- [ ] Pines por categoría con icono + etiqueta accesible.
- [ ] Sin permiso de ubicación la pantalla sigue siendo útil.
- [ ] Sin red se muestran los pines de la caché.
- [ ] La ubicación nunca se solicita en segundo plano ni se envía sin acción del usuario (solo a `GET /pois/cercanos`).
- [ ] Pruebas y lint verdes.

## 6. Prohibido
Permisos de ubicación en segundo plano · claves de Maps en el repositorio · pines distinguibles solo por color.
