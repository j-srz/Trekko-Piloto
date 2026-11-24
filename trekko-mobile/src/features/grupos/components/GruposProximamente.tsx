import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colores, espacio, texto } from '../../../theme/tokens';

export function GruposProximamente() {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <Feather name="users" size={40} color={colores.azulProfundo} accessibilityElementsHidden importantForAccessibility="no" />
        <Text style={texto.h2} accessibilityRole="header">Próximamente</Text>
        <Text style={styles.message}>La función de grupos estará disponible en una próxima fase.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colores.fondo },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.m,
    paddingHorizontal: espacio.xl,
  },
  message: { ...texto.cuerpo, textAlign: 'center' },
});
