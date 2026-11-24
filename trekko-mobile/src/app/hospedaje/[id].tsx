import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton } from '../../components/ui/Boton';
import { Calificacion } from '../../components/ui/Calificacion';
import { colores, espacio, fuente, radio, sombra, texto } from '../../constants/tokens';
import { HOSPEDAJES_EJEMPLO } from '../../features/inicio/data/datosEjemplo';
import { MapaReal } from '../../features/mapa/components/MapaReal';

export default function ResumenHospedajeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [imagenError, setImagenError] = useState(false);
  const hospedaje = HOSPEDAJES_EJEMPLO.find((item) => item.id === id);

  if (!hospedaje) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={estilos.pantalla}>
          <Pressable onPress={() => router.back()} style={estilos.volver}>
            <Feather name="arrow-left" size={22} color={colores.azulProfundo} />
          </Pressable>
          <View style={estilos.noEncontrado}>
            <Text style={texto.h3}>No encontramos este alojamiento</Text>
            <Boton titulo="Volver" onPress={() => router.back()} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  const anfitrion = hospedaje.anfitrion;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={estilos.pantalla} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        >
          <View style={estilos.hero}>
            {imagenError ? (
              <View style={[estilos.imagen, estilos.imagenRespaldo]}>
                <Feather name="image" size={38} color={colores.gris} />
              </View>
            ) : (
              <Image
                source={typeof hospedaje.imagen === 'number' ? hospedaje.imagen : { uri: hospedaje.imagen }}
                style={estilos.imagen}
                contentFit="cover"
                transition={250}
                accessibilityLabel={hospedaje.nombre}
                onError={() => setImagenError(true)}
              />
            )}
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [estilos.botonVolver, pressed && estilos.presionado]}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Feather name="arrow-left" size={22} color={colores.azulProfundo} />
            </Pressable>
          </View>

          <View style={estilos.contenido}>
            <Text style={texto.h2} accessibilityRole="header">{hospedaje.nombre}</Text>
            <Calificacion valor={hospedaje.calificacion} reseñas={hospedaje.reseñas} tamano={14} />
            <View style={estilos.datosRapidos}>
              <Feather name="map-pin" size={15} color={colores.gris} />
              <Text style={estilos.datoTexto}>
                {hospedaje.zona}{hospedaje.distancia ? ` · ${hospedaje.distancia}` : ''}
              </Text>
            </View>
            {hospedaje.capacidad != null && (
              <View style={estilos.datosRapidos}>
                <Feather name="users" size={15} color={colores.gris} />
                <Text style={estilos.datoTexto}>Hasta {hospedaje.capacidad} personas</Text>
              </View>
            )}

            <View style={estilos.separador} />
            <Text style={estilos.descripcion}>
              {hospedaje.descripcion ?? 'Un lugar cómodo para disfrutar tu próxima escapada.'}
            </Text>

            {hospedaje.coordenada && (
              <View style={estilos.seccion}>
                <Text style={texto.h3}>Ubicación</Text>
                <MapaReal
                  style={estilos.mapaUbicacion}
                  initialCenter={hospedaje.coordenada}
                  initialZoom={14}
                  markers={[
                    {
                      id: hospedaje.id,
                      nombre: hospedaje.nombre,
                      coordenada: hospedaje.coordenada,
                      tipo: 'Hospedaje',
                    },
                  ]}
                />
                <Text style={estilos.textoMapa}>© OpenStreetMap contributors</Text>
              </View>
            )}

            {!!hospedaje.amenidades?.length && (
              <View style={estilos.seccion}>
                <Text style={texto.h3}>Lo que ofrece</Text>
                <View style={estilos.amenidades}>
                  {hospedaje.amenidades.map((amenidad) => (
                    <View key={amenidad} style={estilos.amenidad}>
                      <Feather name="check" size={14} color={colores.verdeBoton} />
                      <Text style={estilos.amenidadTexto}>{amenidad}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {anfitrion && (
              <View style={estilos.seccion}>
                <Text style={texto.h3}>Tu anfitrión</Text>
                <View style={estilos.tarjetaAnfitrion}>
                  <View style={estilos.avatar}>
                    <Text style={estilos.iniciales}>
                      {anfitrion.nombre.split(' ').map((parte) => parte[0]).slice(0, 2).join('')}
                    </Text>
                  </View>
                  <View style={estilos.infoAnfitrion}>
                    <Text style={estilos.nombreAnfitrion}>{anfitrion.nombre}</Text>
                    <Text style={estilos.usuario}>{anfitrion.usuario}</Text>
                    <Text style={estilos.biografia}>{anfitrion.biografia}</Text>
                  </View>
                </View>
              </View>
            )}

            {hospedaje.reseñaDestacada && (
              <View style={estilos.seccion}>
                <Text style={texto.h3}>Lo que cuentan los viajeros</Text>
                <View style={estilos.tarjetaReseña}>
                  <Text style={estilos.estrellas}>★★★★★</Text>
                  <Text style={estilos.comentario}>“{hospedaje.reseñaDestacada.comentario}”</Text>
                  <Text style={estilos.autorReseña}>{hospedaje.reseñaDestacada.autor}</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={[estilos.pie, { paddingBottom: Math.max(insets.bottom, espacio.m) }]}>
          <View style={estilos.precio}>
            <Text style={estilos.precioValor}>
              {hospedaje.precioPorNoche != null ? `$${hospedaje.precioPorNoche.toLocaleString('es-MX')}` : 'Consultar'}
            </Text>
            {hospedaje.precioPorNoche != null && <Text style={estilos.precioUnidad}>/ noche</Text>}
          </View>
          <Boton
            titulo="Ver fechas disponibles"
            onPress={() =>
              router.push({
                pathname: '/hospedaje/[id]/fechas',
                params: { id: hospedaje.id },
              })
            }
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  hero: { marginHorizontal: espacio.l, marginTop: espacio.s, position: 'relative' },
  imagen: { width: '100%', height: 245, borderRadius: radio.tarjeta },
  imagenRespaldo: {
    backgroundColor: colores.deshabilitadoFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonVolver: {
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
  presionado: { opacity: 0.75 },
  contenido: { paddingHorizontal: espacio.xl, paddingTop: espacio.l },
  datosRapidos: { flexDirection: 'row', alignItems: 'center', gap: espacio.s, marginTop: espacio.s },
  datoTexto: { ...texto.micro, flex: 1 },
  separador: { height: 1, backgroundColor: colores.borde, marginVertical: espacio.l },
  descripcion: { ...texto.cuerpo, color: colores.azulProfundo, lineHeight: 22 },
  seccion: { marginTop: espacio.xl, gap: espacio.m },
  mapaUbicacion: { height: 190, borderRadius: radio.tarjeta },
  textoMapa: { ...texto.micro, fontSize: 10 },
  amenidades: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s },
  amenidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    borderRadius: radio.chip,
    backgroundColor: colores.verdeSuave,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.s,
  },
  amenidadTexto: { fontFamily: fuente.medium, fontSize: 12, color: colores.azulProfundo },
  tarjetaAnfitrion: {
    flexDirection: 'row',
    gap: espacio.m,
    padding: espacio.l,
    borderRadius: radio.tarjeta,
    backgroundColor: colores.tarjeta,
    ...sombra.nivel1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colores.verde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciales: { color: colores.tarjeta, fontFamily: fuente.semibold, fontSize: 14 },
  infoAnfitrion: { flex: 1, gap: espacio.xs },
  nombreAnfitrion: { fontFamily: fuente.semibold, fontSize: 15, color: colores.azulProfundo },
  usuario: { ...texto.micro, fontSize: 11 },
  biografia: { ...texto.micro, lineHeight: 18, marginTop: espacio.xs },
  tarjetaReseña: {
    padding: espacio.l,
    gap: espacio.s,
    borderRadius: radio.tarjeta,
    backgroundColor: colores.tarjeta,
    ...sombra.nivel1,
  },
  estrellas: { color: colores.amber, fontSize: 15, letterSpacing: 2 },
  comentario: { ...texto.cuerpo, color: colores.azulProfundo },
  autorReseña: { ...texto.micro, fontFamily: fuente.semibold },
  pie: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    paddingHorizontal: espacio.xl,
    paddingTop: espacio.m,
    backgroundColor: colores.tarjeta,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.borde,
  },
  precio: { flex: 1 },
  precioValor: { fontFamily: fuente.bold, fontSize: 18, color: colores.azulProfundo },
  precioUnidad: { ...texto.micro, fontSize: 11 },
  noEncontrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacio.xl, gap: espacio.l },
  volver: { padding: espacio.l },
});
