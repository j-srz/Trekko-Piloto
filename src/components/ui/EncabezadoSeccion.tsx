/**
 * EncabezadoSeccion — fila con el título de la sección y el enlace "Ver todas".
 *
 * El enlace usa verdeBoton para tener contraste suficiente
 * sobre fondo blanco (ratio > 4.5:1).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colores, espacio, fuente } from '../../constants/tokens';

interface EncabezadoSeccionProps {
  titulo: string;
  onVerTodas?: () => void;
}

export function EncabezadoSeccion({ titulo, onVerTodas }: EncabezadoSeccionProps) {
  return (
    <View style={estilos.fila}>
      <Text style={estilos.titulo}>{titulo}</Text>
      {onVerTodas && (
        <Pressable
          onPress={onVerTodas}
          accessibilityRole="link"
          accessibilityLabel={`Ver todas las ${titulo}`}
          hitSlop={8}
        >
          <Text style={estilos.enlace}>Ver todas</Text>
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacio.xl,
    marginBottom: espacio.m,
  },
  titulo: {
    fontFamily: fuente.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colores.azulProfundo,
  },
  enlace: {
    fontFamily: fuente.semibold,
    fontSize: 14,
    lineHeight: 20,
    // verdeBoton tiene contraste > 4.5:1 sobre blanco
    color: colores.verdeBoton,
  },
});
