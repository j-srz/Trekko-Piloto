/**
 * CarruselHorizontal — lista horizontal perezosa con FlatList.
 *
 * - Espacio entre tarjetas: 12 (espacio.m)
 * - Margen izquierdo inicial: 24 (espacio.xl)
 * - Margen derecho final: 24 para que la última tarjeta no quede cortada
 * - keyExtractor requiere que cada item tenga un campo `id: string`
 *
 * Uso:
 *   <CarruselHorizontal
 *     datos={lugares}
 *     renderItem={({ item }) => <TarjetaLugar lugar={item} />}
 *   />
 */

import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { espacio } from '../../constants/tokens';

interface CarruselHorizontalProps<T extends { id: string }> {
  datos: T[];
  renderItem: ({ item }: { item: T }) => React.ReactElement;
}

export function CarruselHorizontal<T extends { id: string }>({
  datos,
  renderItem,
}: CarruselHorizontalProps<T>) {
  return (
    <FlatList
      data={datos}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      horizontal
      showsHorizontalScrollIndicator={false}
      // El margen izquierdo lo da el contentContainerStyle,
      // así el primer elemento queda alineado con el resto de la pantalla.
      contentContainerStyle={estilos.contenido}
      ItemSeparatorComponent={() => <React.Fragment />}
      // Separador entre tarjetas — usamos gap en contentContainerStyle
      // para evitar añadir un componente extra en el árbol.
      style={estilos.lista}
      // Evita que la lista capture el scroll vertical del padre
      nestedScrollEnabled={false}
    />
  );
}

const estilos = StyleSheet.create({
  lista: {
    flexGrow: 0, // evita que la FlatList se expanda verticalmente
  },
  contenido: {
    paddingLeft: espacio.xl,   // 24 — alineado con el margen de pantalla
    paddingRight: espacio.xl,  // 24 — para que la última tarjeta no se corte
    gap: espacio.m,            // 12 entre tarjetas
  },
});
