/**
 * ImagenTarjeta — imagen de cabecera de las tarjetas.
 *
 * Usa expo-image para caché automático (offline-first).
 *
 * Estados:
 *   - Cargando: placeholder gris animado
 *   - Error / sin URL: color de respaldo (#C9D3DA) + ícono de paisaje
 *   - Éxito: imagen con transición suave de fundido
 */

import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colores, radio } from '../../constants/tokens';

interface ImagenTarjetaProps {
  /** URL remota o número de require() local. */
  fuente: string | number;
  /** Alto de la imagen. El ancho viene del contenedor padre. */
  alto: number;
  /** Radio de esquina superior. Por defecto radio.tarjeta. */
  radioEsquina?: number;
  /** Texto accesible para lectores de pantalla. */
  descripcion?: string;
}

/** Color que se muestra mientras carga o cuando la imagen falla. */
const COLOR_RESPALDO = colores.grisImagen;

/** Ícono de paisaje en UTF-8 para el estado de error. */
const ICONO_ERROR = '🏔';

export function ImagenTarjeta({
  fuente: src,
  alto,
  radioEsquina = radio.tarjeta,
  descripcion = 'Imagen del lugar',
}: ImagenTarjetaProps) {
  const [error, setError] = React.useState(false);

  const estiloContenedor = {
    height: alto,
    borderTopLeftRadius: radioEsquina,
    borderTopRightRadius: radioEsquina,
    overflow: 'hidden' as const,
    backgroundColor: COLOR_RESPALDO,
  };

  if (error || !src) {
    return (
      <View style={[estiloContenedor, estilos.respaldo]}>
        <Text style={estilos.iconoError}>{ICONO_ERROR}</Text>
      </View>
    );
  }

  return (
    <Image
      source={typeof src === 'number' ? src : { uri: src }}
      style={estiloContenedor}
      contentFit="cover"
      transition={300}
      accessibilityLabel={descripcion}
      accessibilityRole="image"
      onError={() => setError(true)}
    />
  );
}

const estilos = StyleSheet.create({
  respaldo: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR_RESPALDO,
  },
  iconoError: {
    fontSize: 32,
    opacity: 0.5,
    color: colores.gris,
  },
});
