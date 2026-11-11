/**
 * EstadoVacio — aparece cuando una sección no tiene resultados
 * con el filtro/búsqueda activos.
 *
 * Muestra: ícono + mensaje + instrucción de qué hacer.
 *
 * Uso:
 *   <EstadoVacio
 *     mensaje="No hay rutas en Cultura"
 *     instruccion="Prueba otra categoría o borra el texto de búsqueda"
 *   />
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espacio, fuente } from '../../constants/tokens';

interface EstadoVacioProps {
  /** Texto principal, ej: "No hay rutas en Cultura" */
  mensaje: string;
  /** Instrucción de acción, ej: "Prueba otra categoría" */
  instruccion?: string;
  /** Emoji o ícono decorativo. Por defecto: 🔍 */
  icono?: string;
}

export function EstadoVacio({
  mensaje,
  instruccion,
  icono = '🔍',
}: EstadoVacioProps) {
  return (
    <View
      style={estilos.contenedor}
      accessible
      accessibilityLabel={[mensaje, instruccion].filter(Boolean).join('. ')}
    >
      <Text style={estilos.icono} accessibilityElementsHidden importantForAccessibility="no">
        {icono}
      </Text>
      <Text style={estilos.mensaje}>{mensaje}</Text>
      {instruccion && (
        <Text style={estilos.instruccion}>{instruccion}</Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacio.xxl,
    paddingHorizontal: espacio.xl,
    gap: espacio.s,
  },
  icono: {
    fontSize: 40,
    marginBottom: espacio.s,
  },
  mensaje: {
    fontFamily: fuente.semibold,
    fontSize: 15,
    lineHeight: 22,
    color: colores.azulProfundo,
    textAlign: 'center',
  },
  instruccion: {
    fontFamily: fuente.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colores.gris,
    textAlign: 'center',
  },
});
