import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvisoOffline } from '../../components/ui/AvisoOffline';
import { Boton } from '../../components/ui/Boton';
import { CampoBusqueda } from '../../components/ui/CampoBusqueda';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { colores, espacio, radio, texto } from '../../theme/tokens';
import { SeccionCarrusel } from '../../features/inicio/components/SeccionCarrusel';
import { TarjetaRutaOriginal } from '../../features/rutas/components/TarjetaRutaOriginal';
import { useRutasOriginales } from '../../features/rutas/hooks/useRutasOriginales';
import { ALTO_BARRA_TABS } from './_layout';

function useBusquedaDebounced(ms = 300) {
  const [texto, setTexto] = useState('');
  const [textoBuscado, setTextoBuscado] = useState('');
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const actualizar = useCallback((valor: string) => {
    setTexto(valor);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTextoBuscado(valor), ms);
  }, [ms]);

  return { texto, textoBuscado, actualizar };
}

export default function InicioScreen() {
  const router = useRouter();
  const rutasOriginales = useRutasOriginales();
  const { texto: busqueda, textoBuscado, actualizar } = useBusquedaDebounced();
  const rutasVisibles = rutasOriginales.rutas
    .filter((ruta) =>
      `${ruta.titulo} ${ruta.municipio.nombre}`.toLowerCase().includes(textoBuscado.toLowerCase()),
    )
    .slice(0, 8);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={rutasOriginales.cargando}
            onRefresh={rutasOriginales.recargar}
            colors={[colores.verdeBoton]}
            tintColor={colores.verdeBoton}
          />
        }
      >
        <View style={styles.header}>
          <Text style={texto.h1} accessibilityRole="header">Explora Trekko</Text>
          <CampoBusqueda valor={busqueda} onCambio={actualizar} />
          <Boton
            titulo="Crear itinerario"
            variante="secundario"
            onPress={() => router.push('/itinerario' as never)}
          />
        </View>

        <AvisoOffline visible={rutasOriginales.offline} />
        {rutasOriginales.error ? (
          <View style={styles.routeState}>
            <Text style={texto.h3}>No pudimos cargar las rutas</Text>
            <Text style={styles.error}>{rutasOriginales.error}</Text>
            <Boton
              titulo="Reintentar"
              variante="secundario"
              onPress={rutasOriginales.recargar}
            />
          </View>
        ) : rutasOriginales.cargando && rutasOriginales.rutas.length === 0 ? (
          <View style={styles.routeState}>
            <ActivityIndicator size="large" color={colores.verdeBoton} />
            <Text style={texto.cuerpo}>Cargando rutas originales...</Text>
          </View>
        ) : rutasOriginales.rutas.length === 0 ? (
          <EstadoVacio
            mensaje="Aún no hay rutas originales publicadas."
            instruccion="Vuelve más tarde para explorar nuevos recorridos."
          />
        ) : rutasVisibles.length > 0 ? (
          <SeccionCarrusel
            titulo="Trekko Originals"
            datos={rutasVisibles}
            renderTarjeta={(ruta) => (
              <TarjetaRutaOriginal
                ruta={ruta}
                onPress={() =>
                  router.push({
                    pathname: '/ruta/[id]',
                    params: { id: ruta.id },
                  })
                }
              />
            )}
            onVerTodas={() => router.push('/rutas' as never)}
          />
        ) : (
          <EstadoVacio
            mensaje="No encontramos rutas con esa búsqueda."
            instruccion="Prueba con otro nombre o municipio."
          />
        )}

        <View style={styles.mapCta}>
          <Text style={texto.h3}>Puntos de interés cercanos</Text>
          <Text style={texto.cuerpo}>Explora el mapa para encontrar lugares usando tu ubicación.</Text>
          <Boton titulo="Abrir mapa" onPress={() => router.navigate('/(tabs)/mapa')} />
        </View>
        <View style={{ height: ALTO_BARRA_TABS + espacio.l }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colores.fondo },
  scroll: { flex: 1 },
  content: { paddingTop: espacio.l, paddingHorizontal: espacio.xl, gap: espacio.xl },
  header: { gap: espacio.m },
  routeState: { gap: espacio.m, alignItems: 'flex-start' },
  error: { ...texto.cuerpo, color: colores.error },
  mapCta: {
    padding: espacio.l,
    gap: espacio.m,
    borderRadius: radio.tarjeta,
    backgroundColor: colores.tarjeta,
  },
});
