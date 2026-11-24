/**
 * Calificacion — fila de estrella + valor numérico + conteo de reseñas.
 *
 * Estados:
 *   - Con valor y reseñas: ★ 4.5 (23)
 *   - Sin reseñas:         ★ Sin reseñas
 *
 * La estrella es decorativa; la descripción accesible usa el texto completo.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espacio, fuente } from '../../constants/tokens';
import { formatearCalificacion } from '../../utils/formato';

interface CalificacionProps {
  valor: number;
  reseñas: number;
  /** Tamaño de fuente base. Por defecto 12. */
  tamano?: number;
}

export function Calificacion({ valor, reseñas, tamano = 12 }: CalificacionProps) {
  const etiqueta = formatearCalificacion(valor, reseñas);
  const descripcionAccesible =
    reseñas === 0
      ? 'Sin reseñas'
      : `${valor.toFixed(1)} de 5, ${reseñas} reseñas`;

  return (
    <View
      style={estilos.fila}
      accessible
      accessibilityLabel={descripcionAccesible}
    >
      {/* Estrella decorativa — oculta para lectores de pantalla */}
      <Text
        style={[estilos.estrella, { fontSize: tamano }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        ★
      </Text>
      <Text style={[estilos.texto, { fontSize: tamano }]}>{etiqueta}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
  },
  estrella: {
    color: colores.amber,
    lineHeight: 16,
  },
  texto: {
    fontFamily: fuente.medium,
    lineHeight: 16,
    color: colores.gris,
  },
});
