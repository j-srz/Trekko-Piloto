/**
 * TarjetaHospedaje — variante para la sección "Hospedaje cerca de ti".
 * Misma forma que TarjetaLugar, precio por noche en la insignia.
 *
 * NOTA: Esta sección está fuera del MVP (features.mostrarHospedaje = false).
 * El componente existe y es funcional; solo la sección está desactivada.
 */

import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Calificacion } from '../../../components/ui/Calificacion';
import { colores, espacio, fuente, tarjetaAncho } from '../../../constants/tokens';
import { formatearCalificacion, formatearPrecioNoche } from '../../../utils/formato';
import type { Hospedaje } from '../types';
import { TarjetaBase } from './TarjetaBase';

interface TarjetaHospedajeProps {
  hospedaje: Hospedaje;
  onPress?: () => void;
}

const ALTO_IMAGEN = 110;

export function TarjetaHospedaje({ hospedaje, onPress }: TarjetaHospedajeProps) {
  const precioTexto = formatearPrecioNoche(hospedaje.precioPorNoche);

  const etiquetaAccesible = [
    hospedaje.nombre,
    hospedaje.zona,
    formatearCalificacion(hospedaje.calificacion, hospedaje.reseñas),
    precioTexto,
  ].join(', ');

  return (
    <TarjetaBase
      imagen={hospedaje.imagen}
      altoImagen={ALTO_IMAGEN}
      ancho={tarjetaAncho.lugar}
      insigniaTexto={precioTexto}
      insigniaVariante="verde"
      insigniaPosicion="izquierda"
      imagenDescripcion={hospedaje.nombre}
      onPress={onPress}
      accessibilityLabel={etiquetaAccesible}
    >
      {/* Nombre */}
      <Text style={estilos.nombre} numberOfLines={2}>
        {hospedaje.nombre}
      </Text>

      {/* Zona */}
      <View style={estilos.fila}>
        <Feather
          name="map-pin"
          size={11}
          color={colores.gris}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={estilos.zona} numberOfLines={1}>
          {hospedaje.zona}
        </Text>
      </View>

      {/* Calificación */}
      <Calificacion valor={hospedaje.calificacion} reseñas={hospedaje.reseñas} />
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
  zona: {
    fontFamily: fuente.regular,
    fontSize: 11,
    lineHeight: 15,
    color: colores.gris,
    flex: 1,
  },
});
