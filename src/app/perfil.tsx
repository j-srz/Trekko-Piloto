import { Feather } from '@expo/vector-icons';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { traducirErrorApi } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { Boton } from '../components/ui/Boton';
import { Card } from '../components/ui/Card';
import { BarraCuenta } from '../features/perfil/BarraCuenta';
import { colores, espacio, texto } from '../theme/tokens';

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, loading } = useAuth();

  async function cerrarSesion() {
    try {
      await logout();
    } catch (cause: unknown) {
      Alert.alert(
        'Cierre de sesión',
        `La sesión local se cerró, pero el servidor no confirmó el cierre. ${traducirErrorApi(cause)}`,
      );
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 112 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={texto.h1} accessibilityRole="header">Mi perfil</Text>
        <Card style={styles.profile}>
          <View style={styles.avatar} accessible accessibilityLabel={`Perfil de ${user?.nombre ?? 'usuario'}`}>
            <Feather name="user" size={28} color={colores.azulProfundo} />
          </View>
          <View style={styles.details}>
            <Text style={styles.name}>{user?.nombre ?? 'Usuario Trekko'}</Text>
            <Text style={styles.email}>{user?.correo ?? 'No hay correo disponible.'}</Text>
          </View>
        </Card>
        <Boton
          titulo="Cerrar sesión"
          onPress={() => Alert.alert('Cerrar sesión', '¿Quieres salir de tu cuenta?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Cerrar sesión', style: 'destructive', onPress: () => void cerrarSesion() },
          ])}
          deshabilitado={loading}
          cargando={loading}
          accessibilityLabel="Cerrar sesión de Trekko"
        />
      </ScrollView>
      <BarraCuenta />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colores.fondo },
  content: { paddingHorizontal: espacio.xl, paddingTop: espacio.xl, gap: espacio.l },
  profile: { flexDirection: 'row', alignItems: 'center', gap: espacio.l },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.verdeSuave,
  },
  details: { flex: 1, gap: espacio.xs },
  name: { ...texto.h3, color: colores.azulProfundo },
  email: { ...texto.cuerpo, color: colores.gris },
});
