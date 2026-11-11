/**
 * TarjetaBase — esqueleto compartido por las cuatro tarjetas.
 *
 * Estructura:
 *   ┌──────────────────────────┐
 *   │  ImagenTarjeta           │  ← imagen con radio superior
 *   │    [insignia encima]     │  ← posición absoluta
 *   ├──────────────────────────┤
 *   │  {children}              │  ← contenido específico de cada variante
 *   └──────────────────────────┘
 *
 * La tarjeta completa es un área táctil única (Pressable).
 * El ancho viene del padre (tokens.tarjetaAncho).
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colores, espacio, radio, sombra } from '../../../constants/tokens';
import { ImagenTarjeta } from '../../../components/ui/ImagenTarjeta';
import { Insignia, VarianteInsignia } from '../../../components/ui/Insignia';

interface TarjetaBaseProps {
  imagen: string | number;
  altoImagen: number;
  ancho: number;
  /** Texto de la insignia flotante sobre la imagen. Si es undefined no se muestra. */
  insigniaTexto?: string;
  insigniaVariante?: VarianteInsignia;
  /** Posición de la insignia: izquierda o derecha. Por defecto: izquierda. */
  insigniaPosicion?: 'izquierda' | 'derecha';
  /** Descripción accesible de la imagen. */
  imagenDescripcion?: string;
  /** Contenido del cuerpo de la tarjeta (debajo de la imagen). */
  children: React.ReactNode;
  /** Callback al presionar toda la tarjeta. */
  onPress?: () => void;
  /** Descripción accesible de la tarjeta completa. */
  accessibilityLabel?: string;
}

export function TarjetaBase({
  imagen,
  altoImagen,
  ancho,
  insigniaTexto,
  insigniaVariante = 'verde',
  insigniaPosicion = 'izquierda',
  imagenDescripcion,
  children,
  onPress,
  accessibilityLabel,
}: TarjetaBaseProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        estilos.contenedor,
        { width: ancho },
        pressed && estilos.presionado,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {/* Imagen con insignia flotante */}
      <View>
        <ImagenTarjeta
          fuente={imagen}
          alto={altoImagen}
          descripcion={imagenDescripcion}
        />
        {insigniaTexto && (
          <View
            style={[
              estilos.insigniaContenedor,
              insigniaPosicion === 'derecha'
                ? estilos.insigniaDerecha
                : estilos.insigniaIzquierda,
            ]}
          >
            <Insignia texto={insigniaTexto} variante={insigniaVariante} />
          </View>
        )}
      </View>

      {/* Cuerpo de la tarjeta */}
      <View style={estilos.cuerpo}>{children}</View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: colores.tarjeta,
    borderRadius: radio.tarjeta,
    overflow: 'hidden',
    ...sombra.nivel1,
  },
  presionado: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  cuerpo: {
    padding: espacio.m,
    gap: espacio.xs,
  },
  insigniaContenedor: {
    position: 'absolute',
    top: espacio.s,
  },
  insigniaIzquierda: {
    left: espacio.s,
  },
  insigniaDerecha: {
    right: espacio.s,
  },
});
