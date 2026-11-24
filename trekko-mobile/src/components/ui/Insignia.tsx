/**
 * Insignia — pequeña etiqueta de color que aparece sobre las tarjetas.
 *
 * Variantes:
 *   'verde'  → precio, "Gratis", estado activo
 *   'oscura' → duración de ruta
 *   'roja'   → grupo lleno
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espacio, fuente, radio } from '../../constants/tokens';

export type VarianteInsignia = 'verde' | 'oscura' | 'roja';

interface InsigniaProps {
  texto: string;
  variante?: VarianteInsignia;
}

const FONDO: Record<VarianteInsignia, string> = {
  verde:  colores.insigniaVerde,
  oscura: colores.insigniaOscura,
  roja:   colores.insigniaRoja,
};

export function Insignia({ texto, variante = 'verde' }: InsigniaProps) {
  return (
    <View style={[estilos.contenedor, { backgroundColor: FONDO[variante] }]}>
      <Text style={estilos.texto} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignSelf: 'flex-start',
    borderRadius: radio.insignia,
    paddingHorizontal: espacio.s,
    paddingVertical: espacio.xs,
  },
  texto: {
    fontFamily: fuente.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: colores.blanco,
    letterSpacing: 0.3,
  },
});
