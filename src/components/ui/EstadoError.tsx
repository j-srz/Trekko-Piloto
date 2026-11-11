import { StyleSheet, Text, View } from 'react-native';
import { Boton } from './Boton';
import { colores, espacio, texto } from '../../theme/tokens';

interface EstadoErrorProps {
  mensaje: string;
  onReintentar: () => void;
}

export function EstadoError({ mensaje, onReintentar }: EstadoErrorProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={texto.h3}>No pudimos cargar el contenido</Text>
      <Text style={styles.message}>{mensaje}</Text>
      <Boton titulo="Reintentar" onPress={onReintentar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espacio.m, padding: espacio.xl },
  message: { ...texto.cuerpo, color: colores.error, textAlign: 'center' },
});
