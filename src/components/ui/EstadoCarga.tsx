import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colores, espacio, texto } from '../../theme/tokens';

interface EstadoCargaProps {
  mensaje?: string;
}

export function EstadoCarga({ mensaje = 'Cargando...' }: EstadoCargaProps) {
  return (
    <View style={styles.container} accessible accessibilityRole="progressbar" accessibilityLabel={mensaje}>
      <ActivityIndicator size="large" color={colores.verdeBoton} />
      <Text style={texto.cuerpo}>{mensaje}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espacio.m },
});
