# Assumptions

- 2026-11-10: H0 follows `../../TREKKO_BACKEND_SPEC.md` as the source of truth. Configuration requires the database URL, JWT secret, data-encryption key, and S3-compatible storage credentials at startup; unrelated H1+ provider settings use documented defaults.
- 2026-11-10: `GET /health` is liveness only. `GET /health/ready` returns 503 unless both PostgreSQL and the configured storage bucket are reachable. The e2e suite uses real PostGIS and a storage health stub; Docker Compose checks the real MinIO bucket.
- 2026-11-10: The reversible bootstrap migration tracks extension ownership and drops only extensions it created; extensions that predated H0 remain installed on rollback. Integration tests verify this in an isolated PostGIS container across `up/down/up`.
- 2026-11-10: Local Compose defaults are development-only credentials to make a one-command local setup possible. Production deployments must supply unique secrets via their secret manager.
- 2026-11-10: Encryption keys use canonical base64 encoding of exactly 32 bytes. AES-GCM payloads contain the IV, authentication tag, and ciphertext as base64url segments.
- 2026-11-10: `presupuestoMax` limita el costo total del grupo (personas incluidas). El generador estima traslados a 30 km/h y MXN 2 por persona-kilómetro; no hay proveedor de distancias ni tarifas externas.
- 2026-11-10: Las horas de inicio y fin se interpretan en la zona horaria del horario de los POIs (los datos iniciales usan `America/Mexico_City`). Si no hay candidatos, se usa esa zona.
- 2026-11-10: `abiertoAhora=true` filtra en memoria antes de paginar para mantener `isOpenAt` como única lógica horaria. El catálogo de muestra tiene 23 lugares reales; sus horarios y costos son estimados. Para catálogos grandes habrá que trasladar la misma lógica a una consulta eficiente sin cambiar sus resultados.
- 2026-11-10: El rate limit incluido es por IP, ruta y proceso, con ventanas de 60 segundos (120 solicitudes globales por ruta; 5 en registro/login). En despliegues con varias réplicas el gateway debe aplicar el límite compartido.
- 2026-11-10: El seed usa lugares reales, no fabrica contactos ni reseñas y marca horarios y costos como referencias de demostración; `seed:catalog` ejecuta migraciones y repite los seeds de forma idempotente. Las coordenadas de mapa incluyen datos de OpenStreetMap (ODbL).
