# FRONT-03 — Pantallas de autenticación

**Fase:** 1 · **Depende de:** FRONT-02, BACK-02 · **Spec origen:** §3.8.3 (registro y login), §3.7.3, RF-01, RF-02, RNF-04, RNF-06 · **CU:** 01, 02

## 1. Objetivo
Registro, login, cierre de sesión, guardia de rutas y aviso de privacidad.

## 2. Archivos permitidos
`apps/mobile/app/(auth)/**`, `apps/mobile/app/_layout.tsx`, `apps/mobile/src/features/auth/**`.

## 3. Estructura

```
features/auth/{components/{FormularioLogin,FormularioRegistro}.tsx, hooks/{useLogin,useRegistro,useSesion}.ts, services/auth.service.ts, validacion.ts, types.ts}
app/(auth)/{login.tsx, registro.tsx, aviso-privacidad.tsx}
```

## 4. Tareas

1. **Validación local previa al envío:** correo con formato válido; contraseña ≥ 8 caracteres (y ≤ 72 bytes); casilla **"Acepto el aviso de privacidad"** obligatoria (`aceptaAviso: true`); nombre 2–80. Mensajes junto a cada campo, con texto (no solo color) y `accessibilityLiveRegion`.
2. **Servicio:** `auth.service.ts` llama a E-01/E-02 y guarda tokens con el store de FRONT-02. Solo este archivo habla con la API de auth.
3. **Errores:** `401` y `409` se muestran con **mensajes genéricos** ("Revisa tus datos e inténtalo de nuevo") sin sugerir si el correo existe. `429` → "Demasiados intentos, espera un momento".
4. **UX de robustez:** botón deshabilitado y `cargando` mientras hay petición (evita doble toque); opción **Reintentar** en fallos de red; teclado correcto por campo (`email-address`, `secureTextEntry`) y botón "mostrar contraseña" accesible.
5. **Guardia de rutas** en `app/_layout.tsx`: sin sesión → `(auth)/login`; con sesión → `(tabs)`. Restaura sesión al abrir sin red si hay token válido/refrescable.
6. **Cerrar sesión** (en Perfil): llama E-04, borra SecureStore y la BD local de datos del usuario (itinerarios/cola), conserva el catálogo.
7. **Aviso de privacidad:** pantalla con el texto (placeholder editable por el equipo legal) que indica ubicación solo durante el uso y anonimización a terceros.
8. **Pruebas:** validaciones; login feliz; error 401 con mensaje genérico; doble toque no duplica; guardia redirige; logout limpia datos; lector de pantalla anuncia errores (test de `accessibilityLiveRegion`).

## 5. Criterios de aceptación
- [ ] Flujo registro→login→logout funciona contra el API real (E-01…E-04).
- [ ] Ningún mensaje revela si un correo existe.
- [ ] Todos los controles con etiqueta de accesibilidad y área táctil ≥ 44/48.
- [ ] Pruebas verdes; lint de fronteras verde.

## 6. Prohibido
Mostrar el motivo exacto del fallo de login · guardar la contraseña · permitir registro sin aceptar el aviso.
