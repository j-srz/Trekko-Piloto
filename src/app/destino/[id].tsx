import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calificacion } from '../../components/ui/Calificacion';
import { Boton } from '../../components/ui/Boton';
import { EstadoCarga } from '../../components/ui/EstadoCarga';
import { EstadoError } from '../../components/ui/EstadoError';
import { traducirErrorApi } from '../../api';
import { obtenerPoi, type Poi } from '../../api/pois';
import { colores, espacio, fuente, radio, sombra, texto } from '../../theme/tokens';
import { MapaReal } from '../../features/mapa/components/MapaReal';
import { formatearPrecio } from '../../utils/formato';
import { estaAbiertoAhora, formatearHorario } from '../../utils/horario';
import { alternarDestinoGuardado, useDestinosGuardados } from '../../features/perfil/guardados';
import { AvisoOffline } from '../../components/ui/AvisoOffline';

export default function ResumenDestinoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const destinosGuardados = useDestinosGuardados();
  const [destino, setDestino] = useState<Poi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string>();
  const [reintentos, setReintentos] = useState(0);
  const [offline, setOffline] = useState(false);
  const guardado = destino ? destinosGuardados.includes(destino.id) : false;

  useEffect(() => {
    let activo = true;
    const timer = setTimeout(() => {
      setCargando(true);
      setError(undefined);
      if (!id) {
        setError('No encontramos este lugar.');
        setCargando(false);
        return;
      }
      void obtenerPoi(id ?? '')
        .then((response) => {
          if (activo) {
            setDestino(response.data);
            setOffline(response.offline);
          }
        })
        .catch((cause: unknown) => {
          if (activo) setError(traducirErrorApi(cause));
        })
        .finally(() => {
          if (activo) setCargando(false);
        });
    }, 0);
    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [id, reintentos]);

  if (cargando) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={estilos.pantalla}>
          <EstadoCarga mensaje="Cargando punto de interés..." />
        </SafeAreaView>
      </>
    );
  }

  if (error || !destino) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={estilos.pantalla}>
          <EstadoError
            mensaje={error ?? 'No encontramos este lugar.'}
            onReintentar={() => setReintentos((valor) => valor + 1)}
          />
        </SafeAreaView>
      </>
    );
  }

  const horario = formatearHorario(destino.horario);
  const tieneHorario = Boolean(
    destino.horario?.siempreAbierto ||
    Object.values(destino.horario?.semana ?? {}).some((intervalos) => Boolean(intervalos?.length)) ||
    destino.horario?.excepciones?.some((excepcion) => Boolean(excepcion.intervalos?.length)),
  );
  const abiertoAhora = tieneHorario ? estaAbiertoAhora(destino.horario) : null;

  async function abrirContacto(url?: string) {
    if (!url) return;
    try {
      if (!(await Linking.canOpenURL(url))) {
        Alert.alert('Acción no disponible', 'No encontramos una aplicación compatible en este dispositivo.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('No pudimos abrir el contacto', 'Inténtalo de nuevo más tarde.');
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={estilos.pantalla} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 112 + insets.bottom }}
        >
          <View style={estilos.hero}>
            <View style={[estilos.imagen, estilos.imagenRespaldo]} accessible accessibilityLabel={destino.nombre}>
              <Feather name="map-pin" size={40} color={colores.azulProfundo} />
            </View>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [estilos.botonVolverHero, pressed && estilos.presionado]}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Feather name="arrow-left" size={22} color={colores.azulProfundo} />
            </Pressable>
          </View>

          <View style={estilos.contenido}>
            <AvisoOffline visible={offline} />
            <Text style={texto.h2} accessibilityRole="header">{destino.nombre}</Text>
            {destino.numeroResenas > 0 ? (
              <Calificacion valor={destino.calificacionPromedio} reseñas={destino.numeroResenas} tamano={14} />
            ) : (
              <Text style={texto.cuerpo}>Aún no hay reseñas.</Text>
            )}
            <View style={estilos.dato}>
              <Feather name="map-pin" size={15} color={colores.gris} />
              <Text style={estilos.datoTexto}>
                {destino.municipio.nombre}
                {destino.distanciaM ? ` · ${(destino.distanciaM / 1000).toFixed(1)} km` : ''}
              </Text>
            </View>
            {destino.direccion && (
              <View style={estilos.dato}>
                <Feather name="navigation" size={15} color={colores.gris} />
                <Text style={estilos.datoTexto}>{destino.direccion}</Text>
              </View>
            )}

            <View style={estilos.separador} />
            <Text style={estilos.descripcion}>
              {destino.descripcion ?? 'Este lugar aún no tiene una descripción disponible.'}
            </Text>

            <View style={estilos.seccion}>
              <Text style={texto.h3}>Horario</Text>
              <Text
                style={[estilos.estadoHorario, abiertoAhora === false && estilos.cerrado]}
                accessibilityLabel={
                  abiertoAhora === null
                    ? 'Horario no disponible'
                    : abiertoAhora
                      ? 'Abierto ahora'
                      : 'Cerrado ahora'
                }
              >
                {abiertoAhora === null ? 'Horario no disponible' : abiertoAhora ? 'Abierto ahora' : 'Cerrado ahora'}
              </Text>
              {horario.map((linea) => <Text key={linea} style={estilos.datoTexto}>{linea}</Text>)}
            </View>

            <View style={estilos.seccion}>
              <Text style={texto.h3}>Cómo llegar</Text>
              <MapaReal
                style={estilos.mapaUbicacion}
                initialCenter={{
                  latitude: destino.ubicacion.lat,
                  longitude: destino.ubicacion.lng,
                }}
                initialZoom={14}
                markers={[
                  {
                    id: destino.id,
                    nombre: destino.nombre,
                    coordenada: {
                      latitude: destino.ubicacion.lat,
                      longitude: destino.ubicacion.lng,
                    },
                    tipo: 'Destino',
                  },
                ]}
              />
              <Text style={estilos.textoMapa}>© OpenStreetMap contributors</Text>
            </View>

            <View style={estilos.seccion}>
              <Text style={texto.h3}>Contacto</Text>
              {destino.contacto.whatsappUrl && (
                <Boton
                  titulo="Contactar por WhatsApp"
                  variante="secundario"
                  onPress={() => void abrirContacto(destino.contacto.whatsappUrl)}
                />
              )}
              {destino.contacto.telefonoUrl && (
                <Boton
                  titulo="Llamar"
                  variante="secundario"
                  onPress={() => void abrirContacto(destino.contacto.telefonoUrl)}
                />
              )}
              {!destino.contacto.whatsappUrl && !destino.contacto.telefonoUrl && (
                <Text style={texto.cuerpo}>No hay datos de contacto disponibles.</Text>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={[estilos.pie, { paddingBottom: Math.max(insets.bottom, espacio.m) }]}>
          <View style={estilos.precio}>
            <Text style={estilos.precioTexto}>{formatearPrecio(destino.costoPromedio)}</Text>
            <Text style={estilos.precioNota}>costo promedio</Text>
          </View>
          <Pressable
            onPress={() => destino && alternarDestinoGuardado(destino.id)}
            style={({ pressed }) => [
              estilos.botonPrimario,
              guardado && estilos.botonGuardado,
              pressed && estilos.presionado,
            ]}
            accessibilityRole="button"
            accessibilityLabel={guardado ? 'Quitar de guardados' : 'Guardar destino'}
            accessibilityState={{ selected: guardado }}
          >
            <Feather
              name={guardado ? 'check' : 'bookmark'}
              size={17}
              color={colores.tarjeta}
            />
            <Text style={estilos.textoBoton}>{guardado ? 'Guardado' : 'Guardar'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  hero: { position: 'relative', marginHorizontal: espacio.l, marginTop: espacio.s },
  imagen: { width: '100%', height: 245, borderRadius: radio.tarjeta },
  imagenRespaldo: {
    backgroundColor: colores.deshabilitadoFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonVolverHero: {
    position: 'absolute',
    top: espacio.m,
    left: espacio.m,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.tarjeta,
    ...sombra.nivel1,
  },
  presionado: { opacity: 0.78 },
  contenido: { paddingHorizontal: espacio.xl, paddingTop: espacio.l },
  dato: { flexDirection: 'row', alignItems: 'center', gap: espacio.s, marginTop: espacio.s },
  datoTexto: { ...texto.micro, flex: 1 },
  estadoHorario: { ...texto.cuerpo, color: colores.verdeBoton, fontFamily: fuente.semibold },
  cerrado: { color: colores.error },
  separador: { height: 1, backgroundColor: colores.borde, marginVertical: espacio.l },
  descripcion: { ...texto.cuerpo, color: colores.azulProfundo, lineHeight: 21 },
  seccion: { marginTop: espacio.xl, gap: espacio.m },
  mapaUbicacion: { height: 190, borderRadius: radio.tarjeta },
  textoMapa: { ...texto.micro, fontSize: 10 },
  pie: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.l,
    paddingHorizontal: espacio.xl,
    paddingTop: espacio.m,
    backgroundColor: colores.fondo,
  },
  precio: { flex: 1 },
  precioTexto: { fontFamily: fuente.semibold, fontSize: 15, color: colores.verdeBoton },
  precioNota: { ...texto.micro, fontSize: 11 },
  botonPrimario: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.s,
    paddingHorizontal: espacio.xl,
    borderRadius: radio.boton,
    backgroundColor: colores.verdeBoton,
  },
  botonGuardado: { backgroundColor: colores.azulProfundo },
  textoBoton: { fontFamily: fuente.semibold, fontSize: 14, color: colores.tarjeta },
});
