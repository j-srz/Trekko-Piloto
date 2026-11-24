import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PantallaCuenta, SeccionCuenta } from '../../features/perfil/PantallaCuenta';
import { colores, espacio, texto } from '../../constants/tokens';

const SECCIONES: SeccionCuenta[] = [
  'perfil',
  'rango',
  'viajes',
  'guardados',
  'ayuda',
  'cuenta',
  'acerca',
];

export default function CuentaSeccionScreen() {
  const { seccion } = useLocalSearchParams<{ seccion: string }>();
  const seccionValida = SECCIONES.find((item) => item === seccion);

  if (!seccionValida) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacio.xl }}>
            <Text style={texto.h3}>No encontramos esta sección</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PantallaCuenta seccion={seccionValida} />
    </>
  );
}
