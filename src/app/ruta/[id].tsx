import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { traducirErrorApi } from '../../api';
import { obtenerRuta, type RouteDetail } from '../../api/routes';
import { Boton } from '../../components/ui/Boton';
import { Card } from '../../components/ui/Card';
import { AvisoOffline } from '../../components/ui/AvisoOffline';
import { EstadoCarga } from '../../components/ui/EstadoCarga';
import { EstadoError } from '../../components/ui/EstadoError';
import { MapaReal } from '../../features/mapa/components/MapaReal';
import { formatearDuracion } from '../../features/rutas/components/TarjetaRutaOriginal';
import { colores, espacio, fuente, radio, texto } from '../../theme/tokens';
import { formatearPrecio } from '../../utils/formato';

export default function ResumenRutaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [ruta, setRuta] = useState<RouteDetail | null>(null);
  const [reintentos, setReintentos] = useState(0);
  const [solicitudTerminada, setSolicitudTerminada] = useState<string>();
  const [fallo, setFallo] = useState<{ key: string; mensaje: string } | null>(null);
  const [offline, setOffline] = useState(false);
  const solicitudKey = `${id ?? ''}:${reintentos}`;
  const cargando = Boolean(id) && solicitudTerminada !== solicitudKey;
  const error = !id
    ? 'No encontramos esta ruta.'
    : fallo?.key === solicitudKey
      ? fallo.mensaje
      : undefined;

  useEffect(() => {
    let activo = true;
    if (!id) return () => { activo = false; };
    void obtenerRuta(id)
      .then((resultado) => {
      if (activo) {
        setRuta(resultado.data);
        setOffline(resultado.offline);
      }
      })
      .catch((cause: unknown) => {
        if (activo) setFallo({ key: solicitudKey, mensaje: traducirErrorApi(cause) });
      })
      .finally(() => {
        if (activo) setSolicitudTerminada(solicitudKey);
      });
    return () => {
      activo = false;
    };
  }, [id, reintentos, solicitudKey]);

  if (cargando) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.screen}>
          <EstadoCarga mensaje="Cargando ruta original..." />
        </SafeAreaView>
      </>
    );
  }

  if (error || !ruta) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.screen}>
          <EstadoError
            mensaje={error ?? 'No encontramos esta ruta.'}
            onReintentar={() => setReintentos((actual) => actual + 1)}
          />
        </SafeAreaView>
      </>
    );
  }

  const paradas = [...ruta.pois].sort((a, b) => a.orden - b.orden);
  const coordenadas = paradas.map(({ ubicacion }) => ({
    latitude: ubicacion.lat,
    longitude: ubicacion.lng,
  }));
  const marcadores = paradas.map((parada) => ({
    id: parada.poiId,
    nombre: parada.nombre,
    coordenada: { latitude: parada.ubicacion.lat, longitude: parada.ubicacion.lng },
    tipo: 'Ruta' as const,
  }));

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Boton titulo="Volver" variante="texto" onPress={() => router.back()} />
          <AvisoOffline visible={offline} />
          <View style={styles.hero} accessibilityElementsHidden importantForAccessibility="no">
            <Feather name="map" size={40} color={colores.azulProfundo} />
          </View>
          <Text style={styles.badge}>TREKKO ORIGINAL</Text>
          <Text style={texto.h2} accessibilityRole="header">{ruta.titulo}</Text>
          <View style={styles.details}>
            <Dato icono="map-pin" valor={ruta.municipio.nombre} />
            <Dato icono="clock" valor={formatearDuracion(ruta.duracionMin)} />
            <Dato icono="dollar-sign" valor={formatearPrecio(ruta.costoEstimado)} />
            <Dato icono="navigation" valor={`${paradas.length} paradas`} />
          </View>

          <View style={styles.section}>
            <Text style={texto.h3}>Acerca de esta ruta</Text>
            <Text style={texto.cuerpo}>
              {ruta.descripcion ?? 'Esta ruta original aún no tiene una descripción disponible.'}
            </Text>
            {ruta.autor && <Text style={styles.author}>Creada por {ruta.autor.nombre}</Text>}
          </View>

          <View style={styles.section}>
            <Text style={texto.h3}>Itinerario</Text>
            {paradas.length ? paradas.map((parada, index) => (
              <Card key={parada.poiId} style={styles.stop}>
                <Text style={styles.stopTitle}>{index + 1}. {parada.nombre}</Text>
                <Text style={styles.stopDetail}>
                  {parada.categoria} · {formatearDuracion(parada.duracionVisitaMin)} · {formatearPrecio(parada.costoPromedio)}
                </Text>
              </Card>
            )) : (
              <Text style={texto.cuerpo}>Esta ruta todavía no tiene paradas publicadas.</Text>
            )}
          </View>

          {paradas.length > 0 && (
            <View style={styles.section}>
              <Text style={texto.h3}>Mapa del recorrido</Text>
              <MapaReal
                style={styles.map}
                markers={marcadores}
                routeCoordinates={coordenadas}
                initialCenter={coordenadas[0]}
                initialZoom={11}
              />
              <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
            </View>
          )}

          <Boton titulo="Ver otras rutas" variante="secundario" onPress={() => router.push('/rutas' as never)} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function Dato({
  icono,
  valor,
}: {
  icono: React.ComponentProps<typeof Feather>['name'];
  valor: string;
}) {
  return (
    <View style={styles.detail}>
      <Feather name={icono} size={15} color={colores.gris} accessibilityElementsHidden importantForAccessibility="no" />
      <Text style={styles.detailText}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colores.fondo },
  content: { paddingHorizontal: espacio.xl, paddingTop: espacio.s, paddingBottom: espacio.xxl, gap: espacio.m },
  hero: { height: 180, borderRadius: radio.tarjeta, backgroundColor: colores.verdeSuave, alignItems: 'center', justifyContent: 'center' },
  badge: {
    alignSelf: 'flex-start',
    color: colores.azulProfundo,
    backgroundColor: colores.terracotaClaro,
    borderRadius: radio.insignia,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.xs,
    fontSize: 12,
    fontWeight: '600',
  },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.m },
  detail: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  detailText: { ...texto.micro, color: colores.azulProfundo },
  section: { gap: espacio.m, marginTop: espacio.m },
  author: { ...texto.micro, color: colores.gris },
  stop: { gap: espacio.s },
  stopTitle: { ...texto.cuerpo, fontFamily: fuente.semibold, color: colores.azulProfundo },
  stopDetail: { ...texto.micro, textTransform: 'capitalize' },
  map: { height: 220, borderRadius: radio.tarjeta },
  attribution: { ...texto.micro, fontSize: 11 },
});
