import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton } from '../../components/ui/Boton';
import { AvisoOffline } from '../../components/ui/AvisoOffline';
import { Chip } from '../../components/ui/Chip';
import { EstadoCarga } from '../../components/ui/EstadoCarga';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { traducirErrorApi } from '../../api';
import { obtenerPoisCercanos, type Poi, type PoiCategory } from '../../api/pois';
import { MapaNativo } from '../../features/mapa/components/MapaNativo';
import { colores, espacio, fuente, radio, sombra, texto } from '../../theme/tokens';
import { ALTO_BARRA_TABS } from './_layout';

const CENTRO_INICIAL = { latitude: 21.8853, longitude: -102.2916 };
const FILTROS_CATEGORIA: { etiqueta: string; categoria: PoiCategory }[] = [
  { etiqueta: 'Restaurantes', categoria: 'restaurante' },
  { etiqueta: 'Hospedaje', categoria: 'hospedaje' },
  { etiqueta: 'Artesanías', categoria: 'artesania' },
  { etiqueta: 'Aventura', categoria: 'aventura' },
  { etiqueta: 'Cultura', categoria: 'cultural' },
  { etiqueta: 'Naturaleza', categoria: 'naturaleza' },
  { etiqueta: 'Transporte', categoria: 'transporte' },
  { etiqueta: 'Otros', categoria: 'otro' },
];
const FILTROS_COSTO = [
  { etiqueta: 'Cualquier costo', minimo: undefined, maximo: undefined },
  { etiqueta: 'Hasta $250', minimo: undefined, maximo: 250 },
  { etiqueta: '$251-$500', minimo: 251, maximo: 500 },
  { etiqueta: 'Más de $500', minimo: 501, maximo: undefined },
];

export default function MapaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permiso, setPermiso] = useState<'cargando' | 'concedido' | 'denegado' | 'error'>('cargando');
  const [puedeSolicitar, setPuedeSolicitar] = useState(true);
  const [ubicacion, setUbicacion] = useState<{ latitude: number; longitude: number }>();
  const [pois, setPois] = useState<Poi[]>([]);
  const [poiSeleccionado, setPoiSeleccionado] = useState<Poi | null>(null);
  const [categorias, setCategorias] = useState<PoiCategory[]>([]);
  const [filtroCosto, setFiltroCosto] = useState(0);
  const [cargandoPois, setCargandoPois] = useState(false);
  const [errorPois, setErrorPois] = useState<string>();
  const [offline, setOffline] = useState(false);
  const [reintentos, setReintentos] = useState(0);

  const solicitarUbicacion = useCallback(async () => {
    try {
      const actual = await Location.getForegroundPermissionsAsync();
      if (!actual.granted && !actual.canAskAgain) {
        setPuedeSolicitar(false);
        setPermiso('denegado');
        return;
      }
      const resultado = actual.granted
        ? actual
        : await Location.requestForegroundPermissionsAsync();
      setPuedeSolicitar(resultado.canAskAgain);
      if (!resultado.granted) {
        setPermiso('denegado');
        return;
      }
      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUbicacion({
        latitude: posicion.coords.latitude,
        longitude: posicion.coords.longitude,
      });
      setPermiso('concedido');
    } catch {
      setPermiso('error');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void solicitarUbicacion(), 0);
    return () => clearTimeout(timer);
  }, [solicitarUbicacion]);

  const filtroSeleccionado = FILTROS_COSTO[filtroCosto];
  useEffect(() => {
    if (!ubicacion) return;
    let activo = true;
    const timer = setTimeout(() => {
      setCargandoPois(true);
      setErrorPois(undefined);
      void obtenerPoisCercanos(ubicacion.latitude, ubicacion.longitude, {
        categorias,
        costoMin: filtroSeleccionado.minimo,
        costoMax: filtroSeleccionado.maximo,
      })
        .then((pagina) => {
          if (activo) {
            setPois(pagina.data.data);
            setOffline(pagina.offline);
            setPoiSeleccionado(null);
          }
        })
        .catch((cause: unknown) => {
          if (activo) setErrorPois(traducirErrorApi(cause));
        })
        .finally(() => {
          if (activo) setCargandoPois(false);
        });
    }, 0);
    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [categorias, filtroSeleccionado, reintentos, ubicacion]);

  const seleccionarCategoria = (categoria?: PoiCategory) => {
    setCategorias((actuales) =>
      categoria
        ? actuales.includes(categoria)
          ? actuales.filter((item) => item !== categoria)
          : [...actuales, categoria]
        : [],
    );
  };

  async function reintentarPermiso() {
    if (!puedeSolicitar) {
      try {
        await Linking.openSettings();
      } catch {
        setPermiso('error');
      }
      return;
    }
    await solicitarUbicacion();
  }

  if (permiso === 'cargando') {
    return (
      <SafeAreaView style={estilos.pantalla}>
        <EstadoCarga mensaje="Solicitando permiso de ubicación..." />
      </SafeAreaView>
    );
  }

  if (permiso !== 'concedido' || !ubicacion) {
    return (
      <SafeAreaView style={estilos.pantalla} edges={['top', 'left', 'right']}>
        <View style={estilos.centroPermiso}>
          <Feather name="map-pin" size={38} color={colores.azulProfundo} />
          <Text style={texto.h2} accessibilityRole="header">
            {permiso === 'denegado' ? 'Ubicación desactivada' : 'No pudimos obtener tu ubicación'}
          </Text>
          <Text style={[texto.cuerpo, estilos.textoCentrado]}>
            {permiso === 'denegado'
              ? 'Permite el acceso a tu ubicación mientras usas Trekko para encontrar puntos de interés cercanos.'
              : 'Revisa los permisos y vuelve a intentarlo.'}
          </Text>
          <Boton
            titulo={permiso === 'denegado' && !puedeSolicitar ? 'Abrir ajustes' : 'Permitir ubicación'}
            onPress={reintentarPermiso}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top', 'left', 'right']}>
      <MapaNativo
        key={`${ubicacion.latitude}:${ubicacion.longitude}`}
        style={StyleSheet.absoluteFill}
        pois={pois}
        center={ubicacion ?? CENTRO_INICIAL}
        muestraUbicacion
        onPoiPress={setPoiSeleccionado}
      />

      <View style={[estilos.encabezado, { top: insets.top + espacio.s }]}>
        <AvisoOffline visible={offline} />
        <View style={estilos.tituloFila}>
          <View style={estilos.iconoEncabezado}>
            <Feather name="map" size={18} color={colores.verdeBoton} />
          </View>
          <View style={estilos.textosEncabezado}>
            <Text style={estilos.titulo}>Explora Trekko</Text>
            <Text style={estilos.subtitulo}>Puntos de interés cercanos</Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.filtros}
        >
          <Chip etiqueta="Todas" seleccionado={categorias.length === 0} onPress={() => seleccionarCategoria()} />
          {FILTROS_CATEGORIA.map((item) => (
            <Chip
              key={item.categoria}
              etiqueta={item.etiqueta}
              seleccionado={categorias.includes(item.categoria)}
              onPress={() => seleccionarCategoria(item.categoria)}
            />
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.filtrosCosto}
        >
          {FILTROS_COSTO.map((item, index) => (
            <Chip
              key={item.etiqueta}
              etiqueta={item.etiqueta}
              seleccionado={filtroCosto === index}
              onPress={() => setFiltroCosto(index)}
            />
          ))}
        </ScrollView>
      </View>

      {cargandoPois && (
        <View style={estilos.cargandoMapa} accessibilityLiveRegion="polite">
          <EstadoCarga mensaje="Buscando puntos cercanos..." />
        </View>
      )}

      {!!errorPois && (
        <View style={[estilos.errorMapa, { bottom: insets.bottom + ALTO_BARRA_TABS + 140 }]}>
          <Text style={[texto.cuerpo, estilos.textoCentrado]}>{errorPois}</Text>
          <Boton titulo="Reintentar" onPress={() => setReintentos((valor) => valor + 1)} />
        </View>
      )}

      <View style={[estilos.panel, { bottom: insets.bottom + ALTO_BARRA_TABS + espacio.s }]}>
        <View style={estilos.manejador} />
        {poiSeleccionado ? (
          <>
            <View style={estilos.filaPanel}>
              <View style={estilos.textoPanel}>
                <Text style={estilos.etiquetaPanel}>
                  {poiSeleccionado.destacado ? 'Destacado · ' : ''}{poiSeleccionado.categoria}
                </Text>
                <Text style={estilos.nombrePanel} numberOfLines={1}>
                  {poiSeleccionado.nombre}
                </Text>
                <Text style={estilos.descripcionPanel}>
                  {poiSeleccionado.municipio.nombre} · ${poiSeleccionado.costoPromedio} promedio
                </Text>
              </View>
              <Pressable
                onPress={() => setPoiSeleccionado(null)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar selección"
                style={estilos.cerrar}
              >
                <Feather name="x" size={19} color={colores.gris} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/destino/[id]', params: { id: poiSeleccionado.id } })}
              style={({ pressed }) => [estilos.botonPanel, pressed && estilos.presionado]}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalle de ${poiSeleccionado.nombre}`}
            >
              <Text style={estilos.textoBoton}>Ver detalle del lugar</Text>
              <Feather name="arrow-right" size={17} color={colores.tarjeta} />
            </Pressable>
          </>
        ) : (
          <>
            <View style={estilos.filaPanel}>
              <View style={estilos.iconoPanel}>
                <Feather name="compass" size={20} color={colores.verdeBoton} />
              </View>
              <View style={estilos.textoPanel}>
                <Text style={estilos.nombrePanel}>
                  {pois.length ? `${pois.length} lugares cercanos` : 'Explora lugares cercanos'}
                </Text>
                <Text style={estilos.descripcionPanel}>
                  {pois.length ? 'Selecciona un marcador para ver sus detalles.' : 'Ajusta los filtros o amplía la zona.'}
                </Text>
              </View>
            </View>
            {pois.length === 0 && !cargandoPois && !errorPois && (
              <EstadoVacio mensaje="No encontramos lugares con estos filtros." instruccion="Prueba otra categoría o costo." />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.mapaFondo },
  encabezado: {
    position: 'absolute',
    left: espacio.l,
    right: espacio.l,
    padding: espacio.m,
    borderRadius: radio.tarjeta,
    backgroundColor: colores.tarjeta,
    ...sombra.nivel1,
  },
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  iconoEncabezado: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colores.verdeSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textosEncabezado: { flex: 1, gap: 2 },
  titulo: { ...texto.h3, fontSize: 17 },
  subtitulo: { ...texto.micro, fontSize: 11 },
  filtros: { gap: espacio.s, paddingTop: espacio.m },
  filtrosCosto: { gap: espacio.s, paddingTop: espacio.s, paddingBottom: espacio.xs },
  centroPermiso: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.m,
    paddingHorizontal: espacio.xl,
  },
  textoCentrado: { textAlign: 'center' },
  cargandoMapa: {
    position: 'absolute',
    top: 270,
    left: espacio.xl,
    right: espacio.xl,
    height: 80,
    backgroundColor: colores.tarjeta,
    borderRadius: radio.tarjeta,
    ...sombra.nivel1,
  },
  errorMapa: {
    position: 'absolute',
    left: espacio.xl,
    right: espacio.xl,
    alignItems: 'center',
    gap: espacio.s,
    padding: espacio.m,
    borderRadius: radio.tarjeta,
    backgroundColor: colores.tarjeta,
    ...sombra.nivel1,
  },
  chip: {
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.s,
    borderRadius: radio.chip,
    backgroundColor: colores.fondo,
  },
  chipActivo: { backgroundColor: colores.verdeBoton },
  textoChip: { fontFamily: fuente.medium, fontSize: 11, color: colores.azulProfundo },
  textoChipActivo: { color: colores.tarjeta },
  panel: {
    position: 'absolute',
    left: espacio.l,
    right: espacio.l,
    padding: espacio.l,
    borderRadius: radio.tarjeta,
    backgroundColor: colores.tarjeta,
    gap: espacio.m,
    ...sombra.nivel2,
  },
  manejador: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colores.borde,
    marginTop: -espacio.s,
  },
  filaPanel: { flexDirection: 'row', alignItems: 'center', gap: espacio.m },
  iconoPanel: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colores.verdeSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoPanel: { flex: 1, gap: 4 },
  etiquetaPanel: { ...texto.micro, color: colores.verdeBoton, fontSize: 10 },
  nombrePanel: { fontFamily: fuente.semibold, color: colores.azulProfundo, fontSize: 15 },
  descripcionPanel: { ...texto.micro, fontSize: 11 },
  cerrar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colores.fondo,
  },
  botonPanel: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.s,
    borderRadius: radio.boton,
    backgroundColor: colores.verdeBoton,
  },
  textoBoton: { fontFamily: fuente.semibold, fontSize: 13, color: colores.tarjeta },
  presionado: { opacity: 0.8 },
});
