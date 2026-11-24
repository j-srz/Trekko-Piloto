# FRONT-09 — Grupos públicos y rutas comunitarias (Fase 2)

**Fase:** 2 · **Depende de:** BACK-09 · **Spec origen:** §3.8.2 (Tabla 24), §3.7.3, §3.11, §5.1, RF-09, RF-10, RF-11, RF-16, RF-20 (acceso) · **CU:** 05, 06, 07

## 1. Objetivo
Pestaña **Grupos** (abiertos, mis grupos, crear), constructor de rutas comunitarias, unirse con cupo, descarga del secreto para uso offline y calificación entre viajeros.

## 2. Archivos permitidos
`apps/mobile/app/(tabs)/grupos.tsx`, `apps/mobile/app/{grupo,ruta}/**`, `apps/mobile/src/features/{grupos,rutas-comunitarias,karma}/**`, SecureStore para secretos de grupo.

## 3. Tareas

1. **Listado de grupos:** abiertos con filtros (municipio, fecha, cupo disponible), "Mis grupos". Tarjeta con ruta, fecha, lugares disponibles (texto "3 de 8 lugares libres"), karma agregado del organizador y marca de **Perfil Verificado** (texto + icono).
2. **Crear grupo:** elegir ruta publicada, cupo ≥ 2, fecha/hora, punto de encuentro (mapa), tolerancia 5–60 min, recurrencia opcional (días y hora). Si la respuesta trae `PUNTO_ENCUENTRO_NO_SEGURO`, mostrar sugerencias de lugares públicos y concurridos. Usuario sancionado → mensaje claro (CUENTA_SUSPENDIDA).
3. **Unirse:** botón con estados (cargando/unido/lleno); `ya_era_miembro` se trata como éxito; `CUPO_LLENO` ofrece avisar o ver otros grupos. Salir y (organizador) cancelar con confirmación.
4. **Secreto de grupo:** al unirse y antes de la salida, descargar `GET /grupos/:id/secreto` y guardarlo en **SecureStore**; indicador "Listo para usar sin señal ✓" (texto + icono). Se borra al finalizar el viaje.
5. **Constructor de rutas comunitarias:** (visible solo para rol Creador) elegir POIs del municipio, ordenar (arrastrar con alternativa accesible "subir/bajar"), duración por parada; costo y duración estimados; guardar borrador (`POST /rutas`) y **Publicar** (`/publicar`) mostrando los errores de validación (`RUTA_INVALIDA`) por parada. Mostrar créditos de autoría.
6. **Calificación entre viajeros:** al quedar el viaje en `resenado`, pantalla para calificar puntualidad/respeto/convivencia (1–5) + etiquetas rápidas; solo agregados en perfiles.
7. **Pruebas:** unirse repetido; cupo lleno; crear con y sin punto seguro; secreto descargado y accesible sin red; constructor valida ≥ 2 paradas; accesibilidad del reordenamiento.

## 4. Criterios de aceptación
- [ ] Flujo crear → unirse → ver secreto offline funciona de punta a punta.
- [ ] El secreto vive solo en SecureStore.
- [ ] El reordenamiento de paradas es operable con lector de pantalla.
- [ ] Pruebas y lint verdes.

## 5. Prohibido
Guardar el secreto en almacenamiento no seguro · mostrar el organizador sin su karma agregado · mostrar quién calificó a quién.
