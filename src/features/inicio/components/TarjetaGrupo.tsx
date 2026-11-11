/**
 * TarjetaGrupo — variante ancha para las secciones de grupos.
 *
 * Cuerpo:
 *   Insignia (arriba derecha): ACTIVO, "N LUGARES" o LLENO
 *   Nombre del grupo (2 líneas)
 *   Nombre de la ruta (1 línea)
 *   Líder · Fecha · Participantes
 *   Enlace "Ver detalles"
 *
 * La insignia se calcula en reglas.ts a partir de los datos del grupo.
 */

import { insigniaDeGrupo } from '@/features/grupos/reglas';
import { Grupo } from '@/features/grupos/types';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colores, espacio, fuente, tarjetaAncho } from '../../../constants/tokens';
import {
  formatearFechaCorta,
  formatearParticipantes,
} from '../../../utils/formato';
import { TarjetaBase } from './TarjetaBase';

interface TarjetaGrupoProps {
  grupo: Grupo;
  onPress?: () => void;
  onVerDetalles?: () => void;
}

const ALTO_IMAGEN = 130;

export function TarjetaGrupo({ grupo, onPress, onVerDetalles }: TarjetaGrupoProps) {
  const insignia = insigniaDeGrupo(grupo);
  const participantesTexto = formatearParticipantes(grupo.participantes, grupo.cupo);
  const fechaTexto = formatearFechaCorta(grupo.salidaEn);

  const etiquetaAccesible = [
    grupo.nombre,
    grupo.rutaNombre,
    `Organizado por ${grupo.lider}`,
    fechaTexto,
    `${participantesTexto} participantes`,
    insignia.texto,
  ].join(', ');

  return (
    <TarjetaBase
      imagen={grupo.imagen}
      altoImagen={ALTO_IMAGEN}
      ancho={tarjetaAncho.grupo}
      insigniaTexto={insignia.texto}
      insigniaVariante={insignia.tono}
      insigniaPosicion="derecha"
      imagenDescripcion={grupo.nombre}
      onPress={onPress}
      accessibilityLabel={etiquetaAccesible}
    >
      {/* Nombre del grupo */}
      <Text style={estilos.nombre} numberOfLines={2}>
        {grupo.nombre}
      </Text>

      {/* Ruta asociada */}
      <Text style={estilos.ruta} numberOfLines={1}>
        {grupo.rutaNombre}
      </Text>

      {/* Fila de metadatos */}
      <View style={estilos.filaMetadatos}>
        <MetaDato icono="user" valor={`Por ${grupo.lider}`} />
        <MetaDato icono="calendar" valor={fechaTexto} />
        <MetaDato icono="users" valor={participantesTexto} />
      </View>

      {/* Enlace Ver detalles */}
      <Pressable
        onPress={onVerDetalles ?? onPress}
        style={estilos.enlaceContenedor}
        accessibilityRole="link"
        accessibilityLabel={`Ver detalles del grupo ${grupo.nombre}`}
        hitSlop={8}
      >
        <Text style={estilos.enlaceTexto}>VER DETALLES</Text>
      </Pressable>
    </TarjetaBase>
  );
}

// ─── Pequeño componente interno para cada metadato ───────────────────────────
function MetaDato({
  icono,
  valor,
}: {
  icono: React.ComponentProps<typeof Feather>['name'];
  valor: string;
}) {
  return (
    <View style={estilos.metaDato}>
      <Feather
        name={icono}
        size={11}
        color={colores.gris}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={estilos.metaDatoTexto} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  nombre: {
    fontFamily: fuente.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colores.azulProfundo,
  },
  ruta: {
    fontFamily: fuente.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colores.gris,
  },
  filaMetadatos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio.m,
    marginTop: espacio.xs,
  },
  metaDato: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
  },
  metaDatoTexto: {
    fontFamily: fuente.regular,
    fontSize: 11,
    lineHeight: 15,
    color: colores.gris,
  },
  enlaceContenedor: {
    marginTop: espacio.s,
  },
  enlaceTexto: {
    fontFamily: fuente.bold,
    fontSize: 11,
    lineHeight: 15,
    color: colores.verdeBoton,
    letterSpacing: 0.8,
  },
});