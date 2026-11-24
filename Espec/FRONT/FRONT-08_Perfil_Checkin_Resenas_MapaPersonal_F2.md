# FRONT-08 — Perfil, check-in, reseñas, puntos, insignias y mapa personal (Fase 2)

**Fase:** 2 · **Depende de:** BACK-08 · **Spec origen:** §3.11 (Perfil), §3.7.2, §5.3, §5.4, RF-15, RF-17 · **CU:** 10

## 1. Objetivo
Check-in verificado (también offline), reseñas por criterios con fotos, y la pestaña **Perfil** con reputación, puntos, insignias, mapa personal y canje con QR.

## 2. Archivos permitidos
`apps/mobile/app/(tabs)/perfil.tsx`, `apps/mobile/app/{checkin,resena,canje}/**`, `apps/mobile/src/features/{perfil,checkin,resenas,gamificacion}/**`, esquema/migración WatermelonDB (tablas `check_ins`, `resenas_pendientes`).

## 3. Tareas

1. **Check-in:** botón en la ficha de POI visible solo si la distancia local ≤ 100 m; toma ubicación con `precision`; encola `checkin.registrar` (`opId`); muestra puntos al confirmarse. Mensajes específicos por rechazo (`UBICACION_LEJANA`, `PRECISION_INSUFICIENTE`, `LIMITE_DIARIO`, `DESPLAZAMIENTO_IMPOSIBLE`).
2. **Reseña:** solo disponible tras un check-in `ok`; estrellas por criterio (precio, servicio, accesibilidad, facilidad para llegar) con aclaración de que la dificultad de acceso se califica aparte; texto ≤ 1000; hasta 4 fotos (compresión local, subida con URL prefirmada del backend, clave enviada en la reseña); encola `resena.crear`. Se puede **omitir** (sin puntos).
3. **Perfil:** reputación, puntos, insignias (con progreso), salidas completadas, **mapa personal** (municipios/POIs visitados con porcentaje, accesible también como lista de texto), ajustes, cambio de modo activo (E-07), cerrar sesión.
4. **Canje:** catálogo de recompensas, `Canjear` → muestra **QR de un solo uso** (código del API) con brillo máximo y aviso de caducidad; para comercios (modo Anfitrión) escáner que llama a `POST /canjes/validar`.
5. **Mostrar siempre** número de reseñas junto a la puntuación; reseñas de POI con paginación.
6. **Pruebas:** check-in offline → sync; reseña bloqueada sin check-in; rechazos con mensaje correcto; QR no persiste tras usarse; accesibilidad del mapa personal.

## 4. Criterios de aceptación
- [ ] Check-in y reseña funcionan offline y sincronizan sin duplicar.
- [ ] No se puede reseñar sin check-in verificado.
- [ ] Mapa personal con alternativa textual accesible.
- [ ] Pruebas y lint verdes.

## 5. Prohibido
Permitir check-in con distancia > 100 m · mostrar quién reseñó con datos sensibles · guardar el código QR en disco tras su uso.
