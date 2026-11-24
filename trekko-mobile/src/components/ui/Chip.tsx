/**
 * Chip — pastilla de filtro para las categorías.
 *
 * Estados: normal, seleccionado, presionado (feedback táctil).
 * Área táctil mínima garantizada con minHeight.
 */

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colores, espacio, fuente, MIN_AREA_TACTIL, radio } from '../../constants/tokens';

interface ChipProps {
  etiqueta: string;
  seleccionado?: boolean;
  onPress?: () => void;
}

export function Chip({ etiqueta, seleccionado = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        seleccionado ? estilos.seleccionado : estilos.normal,
        pressed && estilos.presionado,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionado }}
      accessibilityLabel={`Filtrar por ${etiqueta}`}
    >
      <Text
        style={[
          estilos.texto,
          seleccionado ? estilos.textoSeleccionado : estilos.textoNormal,
        ]}
      >
        {etiqueta}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    borderRadius: radio.chip,
    paddingHorizontal: espacio.l,
    paddingVertical: espacio.s,
    minHeight: MIN_AREA_TACTIL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  normal: {
    backgroundColor: colores.fondo,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  seleccionado: {
    backgroundColor: colores.azulProfundo,
    borderWidth: 0,
  },
  presionado: {
    opacity: 0.75,
  },
  texto: {
    fontFamily: fuente.medium,
    fontSize: 14,
    lineHeight: 18,
  },
  textoNormal: {
    color: colores.gris,
  },
  textoSeleccionado: {
    color: colores.blanco,
  },
});
