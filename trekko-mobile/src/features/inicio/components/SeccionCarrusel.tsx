/**
 * SeccionCarrusel — sección genérica reutilizable.
 *
 * Recibe: título, datos, qué tarjeta dibujar y qué hacer en "Ver todas".
 * Las cuatro secciones de la pantalla Inicio son cuatro usos de este mismo
 * componente con props diferentes.
 *
 * Si `datos` llega vacío, la sección no se dibuja en absoluto
 * (no deja un hueco en blanco ni un título sin contenido).
 *
 * Uso:
 *   <SeccionCarrusel
 *     titulo="Grupos activos"
 *     datos={grupos}
 *     renderTarjeta={(grupo) => <TarjetaGrupo grupo={grupo} />}
 *     onVerTodas={() => router.push('/grupos')}
 *   />
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CarruselHorizontal } from '../../../components/ui/CarruselHorizontal';
import { EncabezadoSeccion } from '../../../components/ui/EncabezadoSeccion';
import { espacio } from '../../../constants/tokens';

interface SeccionCarruselProps<T extends { id: string }> {
  titulo: string;
  datos: T[];
  renderTarjeta: (item: T) => React.ReactElement;
  onVerTodas?: () => void;
}

export function SeccionCarrusel<T extends { id: string }>({
  titulo,
  datos,
  renderTarjeta,
  onVerTodas,
}: SeccionCarruselProps<T>) {
  // Si no hay datos, no dibujamos nada — sin título huérfano ni espacio vacío.
  if (datos.length === 0) return null;

  return (
    <View style={estilos.contenedor}>
      <EncabezadoSeccion titulo={titulo} onVerTodas={onVerTodas} />
      <CarruselHorizontal
        datos={datos}
        renderItem={({ item }) => renderTarjeta(item)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    marginBottom: espacio.xl,
  },
});
