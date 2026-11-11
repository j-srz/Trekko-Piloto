import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colores, espacio, radio, sombra } from '../../theme/tokens';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    padding: espacio.l,
    borderRadius: radio.tarjeta,
    backgroundColor: colores.tarjeta,
    ...sombra.nivel1,
  },
});
