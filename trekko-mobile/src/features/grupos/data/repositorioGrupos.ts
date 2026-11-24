/**
 * Repositorio de grupos. Hoy devuelve datos de ejemplo con una pausa
 * simulada; después se cambia por SQLite o el backend sin tocar la pantalla.
 */

import type { Grupo } from '../types';
import { crearGruposEjemplo } from './datosGrupos';

export async function obtenerGrupos(): Promise<Grupo[]> {
    await new Promise((resolver) => setTimeout(resolver, 600));
    return crearGruposEjemplo();
}