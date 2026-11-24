/**
 * TarjetaLugar — variante para la sección "Nuevo en tu zona".
 *
 * Estructura del cuerpo:
 *   Insignia de precio (arriba izquierda, sobre imagen)
 *   Nombre (2 líneas máx)
 *   📍 Municipio
 *   ★ Calificación
 */

import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espacio, fuente, tarjetaAncho } from '../../../constants/tokens';
import { formatearCalificacion, formatearPrecio } from '../../../utils/formato';
import type { Lugar } from '../types';
import { Calificacion } from '../../../components/ui/Calificacion';
import { TarjetaBase } from './TarjetaBase';

interface TarjetaLugarProps {
  lugar: Lugar;
  onPress?: () => void;
}

const ALTO_IMAGEN = 110;

export function TarjetaLugar({ lugar, onPress }: TarjetaLugarProps) {
  const precioTexto = formatearPrecio(lugar.precio);
  const etiquetaAccesible = [
    lugar.nombre,
    lugar.municipio,
    formatearCalificacion(lugar.calificacion, lugar.reseñas),
    precioTexto,
  ].join(', ');

  return (
    <TarjetaBase
      imagen={lugar.imagen}
      altoImagen={ALTO_IMAGEN}
      ancho={tarjetaAncho.lugar}
      insigniaTexto={precioTexto}
      insigniaVariante="verde"
      insigniaPosicion="izquierda"
      imagenDescripcion={lugar.nombre}
      onPress={onPress}
      accessibilityLabel={etiquetaAccesible}
    >
      {/* Nombre */}
      <Text style={estilos.nombre} numberOfLines={2}>
        {lugar.nombre}
      </Text>

      {/* Ubicación */}
      <View style={estilos.fila}>
        <Feather
          name="map-pin"
          size={11}
          color={colores.gris}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={estilos.ubicacion} numberOfLines={1}>
          {lugar.municipio}
        </Text>
      </View>

      {/* Calificación */}
      <Calificacion valor={lugar.calificacion} reseñas={lugar.reseñas} />
    </TarjetaBase>
  );
}

const estilos = StyleSheet.create({
  nombre: {
    fontFamily: fuente.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colores.azulProfundo,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
  },
  ubicacion: {
    fontFamily: fuente.regular,
    fontSize: 11,
    lineHeight: 15,
    color: colores.gris,
    flex: 1,
  },
});
