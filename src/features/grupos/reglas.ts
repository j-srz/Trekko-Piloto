/**
 * Reglas de negocio de Grupos. Son funciones puras: reciben datos y la
 * fecha de "ahora" y devuelven una respuesta. No leen nada de afuera.
 */

import type { Grupo, InsigniaGrupo, SeccionesGrupos } from './types';

export const LUGARES_CASI_COMPLETO = 3;
export const DIAS_GRUPO_NUEVO = 7;

const MS_DIA = 24 * 60 * 60 * 1000;

const salida = (g: Grupo) => new Date(g.salidaEn);
const creado = (g: Grupo) => new Date(g.creadoEn);

export function lugaresDisponibles(g: Grupo): number {
    return Math.max(0, g.cupo - g.participantes);
}

export function estaLleno(g: Grupo): boolean {
    return lugaresDisponibles(g) === 0;
}

/** Un grupo se muestra si está en curso o si su salida aún no ocurre. */
export function esVisible(g: Grupo, ahora: Date): boolean {
    return g.enCurso || salida(g) >= ahora;
}

/** ACTIVO si está en curso; LLENO si no hay lugares; si no, "N LUGARES". */
export function insigniaDeGrupo(g: Grupo): InsigniaGrupo {
    if (g.enCurso) return { texto: 'ACTIVO', tono: 'verde' };
    if (estaLleno(g)) return { texto: 'LLENO', tono: 'roja' };
    const n = lugaresDisponibles(g);
    return { texto: n === 1 ? '1 LUGAR' : `${n} LUGARES`, tono: 'verde' };
}

/**
 * Fin de semana de referencia: de viernes 00:00 a domingo 23:59.
 * Entre lunes y viernes es el próximo; sábado y domingo, el actual.
 */
export function limitesFinDeSemana(ahora: Date): { inicio: Date; fin: Date } {
    const diasHastaDomingo = (7 - ahora.getDay()) % 7; // domingo = 0
    const fin = new Date(ahora);
    fin.setDate(ahora.getDate() + diasHastaDomingo);
    fin.setHours(23, 59, 59, 999);

    const inicio = new Date(fin);
    inicio.setDate(fin.getDate() - 2);
    inicio.setHours(0, 0, 0, 0);

    return { inicio, fin };
}

export function esDeFinDeSemana(g: Grupo, ahora: Date): boolean {
    if (!esVisible(g, ahora)) return false;
    if (g.enCurso) return true;
    const { inicio, fin } = limitesFinDeSemana(ahora);
    const s = salida(g);
    return s >= inicio && s <= fin;
}

export function esCasiCompleto(g: Grupo, ahora: Date): boolean {
    return (
        !g.enCurso &&
        esVisible(g, ahora) &&
        !estaLleno(g) &&
        lugaresDisponibles(g) <= LUGARES_CASI_COMPLETO
    );
}

export function esNuevo(g: Grupo, ahora: Date): boolean {
    if (!esVisible(g, ahora)) return false;
    const edad = ahora.getTime() - creado(g).getTime();
    return edad <= DIAS_GRUPO_NUEVO * MS_DIA;
}

/** Reparte los grupos en las tres secciones, ya ordenados. */
export function organizarGrupos(
    grupos: Grupo[],
    ahora: Date = new Date(),
): SeccionesGrupos {
    const porSalida = (a: Grupo, b: Grupo) =>
        salida(a).getTime() - salida(b).getTime();

    return {
        finDeSemana: grupos.filter((g) => esDeFinDeSemana(g, ahora)).sort(porSalida),
        casiCompletos: grupos
            .filter((g) => esCasiCompleto(g, ahora))
            .sort(
                (a, b) =>
                    lugaresDisponibles(a) - lugaresDisponibles(b) || porSalida(a, b),
            ),
        nuevos: grupos
            .filter((g) => esNuevo(g, ahora))
            .sort((a, b) => creado(b).getTime() - creado(a).getTime()),
    };
}