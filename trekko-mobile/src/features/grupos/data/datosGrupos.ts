/**
 * Datos de ejemplo de grupos. Las fechas se calculan respecto a "hoy",
 * así las secciones nunca quedan vacías con el paso de los días.
 */

import { limitesFinDeSemana } from '../reglas';
import type { Grupo } from '../types';


const IMG_A = 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800';
const IMG_B = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800';
const IMG_C = 'https://images.unsplash.com/photo-1528543606781-2f6e6857f318?w=800';
const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

/** Fecha ISO a cierta hora, N días desde hoy (N negativo = pasado). */
function enDias(ahora: Date, dias: number, hora: number): string {
    const f = new Date(ahora);
    f.setDate(f.getDate() + dias);
    f.setHours(hora, 0, 0, 0);
    return f.toISOString();
}

function desdeAhora(ahora: Date, ms: number): string {
    return new Date(ahora.getTime() + ms).toISOString();
}

export function crearGruposEjemplo(ahora: Date = new Date()): Grupo[] {
    const { inicio } = limitesFinDeSemana(ahora);

    // Sábado 8:00 y domingo 7:00 de este fin de semana. Si ya pasaron,
    // se mueven a 2 horas desde ahora para que sigan apareciendo en pruebas.
    const masTarde = (ms: number) =>
        new Date(Math.max(ms, ahora.getTime() + 2 * HORA)).toISOString();
    const sabado = masTarde(inicio.getTime() + DIA + 8 * HORA);
    const domingo = masTarde(inicio.getTime() + 2 * DIA + 7 * HORA);

    return [
        {
            // En curso → ACTIVO
            id: 'g1',
            nombre: 'Aventura Sierra Madre',
            rutaNombre: 'Tarde en San José de Gracia',
            lider: 'Carlos M.',
            salidaEn: desdeAhora(ahora, -1 * HORA),
            creadoEn: enDias(ahora, -20, 10),
            enCurso: true,
            participantes: 4,
            cupo: 8,
            imagen: IMG_A,
            coordenada: { latitude: 22.159, longitude: -102.415 },
        },
        {
            // Fin de semana + casi completo (3 lugares)
            id: 'g2',
            nombre: 'Caminata al Salto',
            rutaNombre: 'Sierra de Aguascalientes',
            lider: 'Daniel R.',
            salidaEn: sabado,
            creadoEn: enDias(ahora, -10, 10),
            enCurso: false,
            participantes: 7,
            cupo: 10,
            imagen: IMG_B,
            coordenada: { latitude: 22.12, longitude: -102.59 },
        },
        {
            // Fin de semana
            id: 'g3',
            nombre: 'Explorando la Sierra Fría',
            rutaNombre: 'Sierra Fría',
            lider: 'Ana G.',
            salidaEn: domingo,
            creadoEn: enDias(ahora, -9, 10),
            enCurso: false,
            participantes: 6,
            cupo: 12,
            imagen: IMG_C,
            coordenada: { latitude: 22.1, longitude: -102.58 },
        },
        {
            // Casi completo (2 lugares)
            id: 'g4',
            nombre: 'Presa Plutarco Elías Calles',
            rutaNombre: 'Presa Plutarco Elías Calles',
            lider: 'Luis T.',
            salidaEn: enDias(ahora, 12, 7),
            creadoEn: enDias(ahora, -12, 10),
            enCurso: false,
            participantes: 8,
            cupo: 10,
            imagen: IMG_B,
            coordenada: { latitude: 22.13, longitude: -102.42 },
        },
        {
            // Nuevo, creado hace un momento
            id: 'g5',
            nombre: 'Rodada a San José de Gracia',
            rutaNombre: 'Tarde en San José de Gracia',
            lider: 'Sofía G.',
            salidaEn: enDias(ahora, 9, 7),
            creadoEn: desdeAhora(ahora, -30 * 60 * 1000),
            enCurso: false,
            participantes: 1,
            cupo: 12,
            imagen: IMG_A,
            coordenada: { latitude: 22.159, longitude: -102.415 },
        },
        {
            // Nuevo, creado ayer
            id: 'g6',
            nombre: 'Mañana en Calvillo',
            rutaNombre: 'Calvillo',
            lider: 'Mateo H.',
            salidaEn: enDias(ahora, 8, 8),
            creadoEn: enDias(ahora, -1, 12),
            enCurso: false,
            participantes: 3,
            cupo: 10,
            imagen: IMG_C,
            coordenada: { latitude: 21.846, longitude: -102.718 },
        },
        {
            // Lleno → LLENO (nuevo, pero no casi completo)
            id: 'g7',
            nombre: 'Rodada nocturna Pabellón',
            rutaNombre: 'Pabellón de Hidalgo',
            lider: 'Valeria S.',
            salidaEn: enDias(ahora, 4, 20),
            creadoEn: enDias(ahora, -3, 10),
            enCurso: false,
            participantes: 10,
            cupo: 10,
            imagen: IMG_B,
            coordenada: { latitude: 22.15, longitude: -102.34 },
        },
        {
            // Un solo lugar + nombre larguísimo
            id: 'g8',
            nombre:
                'Senderismo por los miradores y cañadas de Real de Asientos con picnic al atardecer',
            rutaNombre: 'Real de Asientos',
            lider: 'Roberto J.',
            salidaEn: enDias(ahora, 5, 7),
            creadoEn: enDias(ahora, -20, 10),
            enCurso: false,
            participantes: 11,
            cupo: 12,
            imagen: IMG_A,
            coordenada: { latitude: 22.24, longitude: -102.05 },
        },
        {
            // Ya salió y no está en curso → no debe aparecer
            id: 'g9',
            nombre: 'Rodada del Cerro del Muerto',
            rutaNombre: 'Cerro del Muerto',
            lider: 'Paola V.',
            salidaEn: enDias(ahora, -3, 8),
            creadoEn: enDias(ahora, -15, 10),
            enCurso: false,
            participantes: 5,
            cupo: 10,
            imagen: IMG_C,
            coordenada: { latitude: 21.78, longitude: -102.45 },
        },
    ];
}