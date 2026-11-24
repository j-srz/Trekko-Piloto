import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espacio, radio, texto } from '../../theme/tokens';

interface AvisoOfflineProps {
  visible: boolean;
}

export function AvisoOffline({ visible }: AvisoOfflineProps) {
  if (!visible) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Feather
        name="wifi-off"
        size={16}
        color={colores.azulProfundo}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.message}>Sin conexión. Mostramos contenido guardado en este dispositivo.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.s,
    padding: espacio.m,
    borderRadius: radio.boton,
    backgroundColor: colores.terracotaClaro,
  },
  message: { ...texto.micro, color: colores.azulProfundo, flex: 1 },
});
