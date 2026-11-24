/**
 * EsqueletoSeccion — fila de esqueletos que imita una SeccionCarrusel en carga.
 *
 * Muestra un encabezado gris + N tarjetas esqueleto del tamaño indicado.
 * Se usa en la pantalla Inicio mientras `useInicio` está en estado cargando.
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colores, espacio, radio } from '../../constants/tokens';
import { EsqueletoTarjeta } from './EsqueletoTarjeta';

type TamanoEsqueleto = 'pequeño' | 'grande';

interface EsqueletoSeccionProps {
  tamaño?: TamanoEsqueleto;
  /** Número de tarjetas a mostrar. Por defecto: 3. */
  cantidad?: number;
}

const COLOR_LINEA = colores.grisEsqueleto;

export function EsqueletoSeccion({
  tamaño = 'pequeño',
  cantidad = 3,
}: EsqueletoSeccionProps) {
  return (
    <View style={estilos.contenedor}>
      {/* Encabezado simulado */}
      <View style={estilos.encabezado}>
        <View style={[estilos.lineaTitulo, { width: 140 }]} />
        <View style={[estilos.lineaTitulo, { width: 60 }]} />
      </View>

      {/* Carrusel de esqueletos */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={estilos.carrusel}
      >
        {Array.from({ length: cantidad }).map((_, i) => (
          <EsqueletoTarjeta key={i} tamaño={tamaño} />
        ))}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    marginBottom: espacio.xl,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espacio.xl,
    marginBottom: espacio.m,
  },
  lineaTitulo: {
    height: 18,
    borderRadius: radio.insignia,
    backgroundColor: COLOR_LINEA,
  },
  carrusel: {
    paddingLeft: espacio.xl,
    paddingRight: espacio.xl,
    gap: espacio.m,
  },
});
