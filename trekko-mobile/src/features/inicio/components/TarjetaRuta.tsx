/**
 * TarjetaRuta — variante ancha para la sección "Rutas populares".
 *
 * Cuerpo:
 *   Insignia de duración (arriba derecha, sobre imagen)
 *   Nombre (2 líneas máx)
 *   📍 Municipio
 *   Fila de datos: ⏱ Tiempo · 💰 Precio · 📍 Destinos · ★ Calificación
 */

import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Calificacion } from '../../../components/ui/Calificacion';
import { colores, espacio, fuente, tarjetaAncho } from '../../../constants/tokens';
import { formatearPrecio } from '../../../utils/formato';
import type { Ruta } from '../types';
import { TarjetaBase } from './TarjetaBase';

interface TarjetaRutaProps {
  ruta: Ruta;
  onPress?: () => void;
}

const ALTO_IMAGEN = 150;

export function TarjetaRuta({ ruta, onPress }: TarjetaRutaProps) {
  const precioTexto = formatearPrecio(ruta.precio);

  const etiquetaAccesible = [
    ruta.nombre,
    ruta.municipio,
    ruta.duracion,
    precioTexto,
    `${ruta.destinos} destinos`,
    `${ruta.calificacion.toFixed(1)} de 5`,
  ].join(', ');

  return (
    <TarjetaBase
      imagen={ruta.imagen}
      altoImagen={ALTO_IMAGEN}
      ancho={tarjetaAncho.ruta}
      insigniaTexto={ruta.duracion}
      insigniaVariante="oscura"
      insigniaPosicion="derecha"
      imagenDescripcion={ruta.nombre}
      onPress={onPress}
      accessibilityLabel={etiquetaAccesible}
    >
      {/* Nombre */}
      <Text style={estilos.nombre} numberOfLines={2}>
        {ruta.nombre}
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
          {ruta.municipio}
        </Text>
      </View>

      {/* Fila de datos */}
      <View style={estilos.filaDatos}>
        <DatoRuta icono="clock" valor={ruta.duracion} />
        <DatoRuta icono="dollar-sign" valor={precioTexto} />
        <DatoRuta icono="navigation" valor={`${ruta.destinos} dest.`} />
        <Calificacion valor={ruta.calificacion} reseñas={ruta.reseñas} />
      </View>
    </TarjetaBase>
  );
}

// ─── Pequeño componente interno para cada dato de la fila ─────────────────────
function DatoRuta({ icono, valor }: { icono: React.ComponentProps<typeof Feather>['name']; valor: string }) {
  return (
    <View style={estilos.dato}>
      <Feather
        name={icono}
        size={11}
        color={colores.gris}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={estilos.datoTexto}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  nombre: {
    fontFamily: fuente.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colores.azulProfundo,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
  },
  ubicacion: {
    fontFamily: fuente.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colores.gris,
    flex: 1,
  },
  filaDatos: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: espacio.m,
    marginTop: espacio.xs,
  },
  dato: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
  },
  datoTexto: {
    fontFamily: fuente.medium,
    fontSize: 11,
    lineHeight: 15,
    color: colores.gris,
  },
});
