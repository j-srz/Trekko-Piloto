# FRONT-07 — Pulido de Fase 1: accesibilidad, robustez, usabilidad y build

**Fase:** 1 · **Depende de:** FRONT-03…06 · **Spec origen:** §3.11, §3.12, §3.10, §1.4 (SUS), RNF-05, RNF-06, RNF-09 · **Hito:** H4

## 1. Objetivo
Cerrar Fase 1 cumpliendo accesibilidad y robustez, con builds EAS y pruebas de usabilidad listas.

## 2. Archivos permitidos
Cualquier archivo de `apps/mobile/` **solo para correcciones de accesibilidad/robustez** (sin funcionalidad nueva), `apps/mobile/eas.json`, `qa/` (reportes).

## 3. Tareas

1. **Auditoría de accesibilidad** (checklist en `qa/a11y-fase1.md`, una fila por pantalla):
   - [ ] VoiceOver (iOS) y TalkBack (Android) recorren cada pantalla en orden lógico, sin elementos mudos.
   - [ ] `accessibilityLabel/Role/State` en todos los controles; imágenes informativas con texto alternativo.
   - [ ] Contraste ≥ 4.5:1 en todo texto; áreas táctiles ≥ 44 pt / 48 dp.
   - [ ] Fuente del sistema al 200 % sin recortes ni solapes.
   - [ ] Ninguna información solo por color (estados abierto/cerrado, destacado, offline, pendiente).
   - [ ] Los errores se anuncian al lector de pantalla.
2. **Robustez (§3.12):** auditar y corregir — botones deshabilitados durante peticiones; ningún flujo permite doble envío; mensajes de error claros con **Reintentar**; estados vacío/cargando/error en **todas** las listas; manejo de red intermitente; app no se rompe con datos nulos (horario vacío, sin contacto, sin fotos).
3. **Rendimiento:** lista de 300+ POIs, arranque en frío < 3 s en gama media, sin fugas de suscripciones de WatermelonDB.
4. **Builds EAS:** perfiles `development`, `preview` (interno) y `production`; secretos (Maps, API URL) por EAS; firma gestionada; checklist de tiendas (iconos, capturas, política de privacidad, permisos justificados).
5. **Usabilidad:** guion de **5 a 8 pruebas guiadas** con tareas de la spec (encontrar una fonda abierta el domingo, generar un itinerario de un día con $800, usar un itinerario sin conexión) y plantilla **SUS** en `qa/sus-plantilla.md` (10 afirmaciones, cálculo 0–100, objetivo ≥ 68).
6. **E2E (Maestro/Detox):** flujos registro → ver POI → contactar → generar itinerario → guardar offline → sincronizar.

## 4. Criterios de aceptación
- [ ] Checklist de accesibilidad 100 % completa sin excepciones críticas.
- [ ] E2E de los flujos listados pasan en Android e iOS.
- [ ] Builds `preview` instalables y probados en dispositivo real.
- [ ] SUS aplicado a 5–8 usuarios con promedio ≥ 68 (o plan de mejora documentado).

## 5. Prohibido
Funcionalidad nueva · bajar estándares de accesibilidad "para el piloto".
