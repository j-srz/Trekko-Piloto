/**
 * Utilidades de formato para la UI de Trekko.
 * Todas usan Intl con localización es-MX para que los números
 * sean consistentes sin importar la configuración del dispositivo.
 */

// ─── Precio ──────────────────────────────────────────────────────────────────

const formatoPeso = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0, // sin centavos para precios enteros
});

/**
 * Formatea un precio en pesos mexicanos.
 * - 0 o undefined → "Gratis"
 * - 120 → "$120"
 * - 1500 → "$1,500"
 *
 * @example
 * formatearPrecio(0)     // "Gratis"
 * formatearPrecio(120)   // "$120"
 * formatearPrecio(1500)  // "$1,500"
 */
export function formatearPrecio(monto: number | undefined): string {
  if (monto === undefined || monto === 0) return 'Gratis';
  // Intl devuelve "MX$120"; reemplazamos para quedarnos solo con "$120"
  return formatoPeso.format(monto).replace('MX', '').trim();
}

/**
 * Formatea un precio por noche.
 * - 0 o undefined → "Gratis"
 * - 980 → "$980/noche"
 *
 * @example
 * formatearPrecioNoche(980)  // "$980/noche"
 * formatearPrecioNoche(0)    // "Gratis"
 */
export function formatearPrecioNoche(monto: number | undefined): string {
  const base = formatearPrecio(monto);
  return base === 'Gratis' ? base : `${base}/noche`;
}

// ─── Fecha ───────────────────────────────────────────────────────────────────

const formatoFecha = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  timeZone: 'America/Mexico_City',
});

/**
 * Formatea una fecha como "15 Nov" o "3 Ene".
 * Acepta un objeto Date o una cadena ISO 8601.
 *
 * @example
 * formatearFechaCorta(new Date('2025-11-15'))  // "15 nov"
 * formatearFechaCorta('2025-01-03')            // "3 ene"
 */
export function formatearFechaCorta(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  // Capitaliza solo la primera letra para homogeneidad ("15 Nov" vs "15 nov" del SO)
  const resultado = formatoFecha.format(d);
  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
}

// ─── Participantes ───────────────────────────────────────────────────────────

/**
 * Muestra "actual/cupo" de participantes de un grupo.
 * Si el grupo está lleno, agrega "(lleno)".
 *
 * @example
 * formatearParticipantes(6, 8)   // "6/8"
 * formatearParticipantes(8, 8)   // "8/8 (lleno)"
 * formatearParticipantes(0, 10)  // "0/10"
 */
export function formatearParticipantes(actuales: number, cupo: number): string {
  const base = `${actuales}/${cupo}`;
  return actuales >= cupo ? `${base} (lleno)` : base;
}

// ─── Calificación ────────────────────────────────────────────────────────────

/**
 * Formatea la calificación con un decimal fijo y el conteo de reseñas entre paréntesis.
 * - Sin reseñas → "Sin reseñas"
 *
 * @example
 * formatearCalificacion(4.5, 23)  // "4.5 (23)"
 * formatearCalificacion(4, 0)     // "Sin reseñas"
 */
export function formatearCalificacion(valor: number, reseñas: number): string {
  if (reseñas === 0) return 'Sin reseñas';
  return `${valor.toFixed(1)} (${reseñas})`;
}
