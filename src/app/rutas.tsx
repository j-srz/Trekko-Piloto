import { Stack, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../components/ui/Boton';
import { AvisoOffline } from '../components/ui/AvisoOffline';
import { EstadoCarga } from '../components/ui/EstadoCarga';
import { EstadoError } from '../components/ui/EstadoError';
import { colores, espacio, texto } from '../theme/tokens';
import { TarjetaRutaOriginal } from '../features/rutas/components/TarjetaRutaOriginal';
import { useRutasOriginales } from '../features/rutas/hooks/useRutasOriginales';

export default function RutasScreen() {
  const router = useRouter();
  const { rutas, cargando, error, offline, recargar } = useRutasOriginales();

  if (cargando && rutas.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.screen}>
          <EstadoCarga mensaje="Cargando rutas originales..." />
        </SafeAreaView>
      </>
    );
  }

  if (error && rutas.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.screen}>
          <EstadoError mensaje={error} onReintentar={recargar} />
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={recargar} tintColor={colores.verdeBoton} />}
        >
          <Boton titulo="Volver" variante="texto" onPress={() => router.back()} />
          <Text style={texto.h2} accessibilityRole="header">Trekko Originals</Text>
          <Text style={styles.description}>Recorridos seleccionados para descubrir destinos de la región.</Text>
          <AvisoOffline visible={offline} />
          {error && <Text style={styles.error}>{error}</Text>}
          {!cargando && rutas.length === 0 ? (
            <View style={styles.empty}>
              <Text style={texto.h3}>Aún no hay rutas publicadas</Text>
              <Text style={texto.cuerpo}>Vuelve más tarde para explorar nuevas rutas originales.</Text>
            </View>
          ) : (
            rutas.map((ruta) => (
              <TarjetaRutaOriginal
                key={ruta.id}
                ruta={ruta}
                onPress={() => router.push({ pathname: '/ruta/[id]', params: { id: ruta.id } })}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colores.fondo },
  content: { paddingHorizontal: espacio.xl, paddingTop: espacio.m, paddingBottom: espacio.xxl, gap: espacio.m },
  description: { ...texto.cuerpo, marginBottom: espacio.s },
  error: { ...texto.cuerpo, color: colores.error },
  empty: { alignItems: 'center', gap: espacio.m, paddingVertical: espacio.xxl },
});
