/**
 * EsqueletoTarjeta — placeholder animado mientras cargan los datos.
 *
 * Imita la forma de las tarjetas reales:
 *   - pequeño: proporción de lugar/hospedaje (≈ 44% de pantalla)
 *   - grande:  proporción de ruta/grupo      (≈ 82% de pantalla)
 *
 * Animación: pulso de opacidad (1.0 → 0.4 → 1.0) con Reanimated.
 * No usa shimmer para mantener compatibilidad con Android sin librerías extra.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colores, espacio, radio, tarjetaAncho } from '../../constants/tokens';

type TamanoEsqueleto = 'pequeño' | 'grande';

interface EsqueletoTarjetaProps {
  tamaño?: TamanoEsqueleto;
}

const ANCHO: Record<TamanoEsqueleto, number> = {
  pequeño: tarjetaAncho.lugar,
  grande:  tarjetaAncho.ruta,
};

const ALTO_IMAGEN: Record<TamanoEsqueleto, number> = {
  pequeño: 110,
  grande:  150,
};

/** Color de los bloques del esqueleto. */
const COLOR_BASE = colores.grisEsqueleto;
/** Color al que pulsa (más claro). */
const COLOR_CLARO = colores.grisSuave;

export function EsqueletoTarjeta({ tamaño = 'pequeño' }: EsqueletoTarjetaProps) {
  const opacidad = useSharedValue(1);

  useEffect(() => {
    opacidad.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 700 }),
        withTiming(1,    { duration: 700 }),
      ),
      -1, // infinito
      false,
    );
  }, [opacidad]);

  const estiloAnimado = useAnimatedStyle(() => ({
    opacity: opacidad.value,
  }));

  const ancho = ANCHO[tamaño];
  const altoImagen = ALTO_IMAGEN[tamaño];

  return (
    <Animated.View style={[estilos.contenedor, { width: ancho }, estiloAnimado]}>
      {/* Imagen */}
      <View style={[estilos.imagen, { height: altoImagen }]} />
      {/* Líneas de texto */}
      <View style={estilos.cuerpo}>
        <View style={[estilos.linea, { width: '80%' }]} />
        <View style={[estilos.linea, { width: '55%' }]} />
        <View style={[estilos.linea, { width: '65%', marginTop: espacio.xs }]} />
      </View>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: COLOR_BASE,
    borderRadius: radio.tarjeta,
    overflow: 'hidden',
  },
  imagen: {
    backgroundColor: COLOR_CLARO,
    borderTopLeftRadius: radio.tarjeta,
    borderTopRightRadius: radio.tarjeta,
  },
  cuerpo: {
    padding: espacio.m,
    gap: espacio.s,
  },
  linea: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLOR_CLARO,
  },
});
