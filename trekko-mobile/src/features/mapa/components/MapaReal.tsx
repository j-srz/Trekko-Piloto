import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { colores } from '../../../theme/tokens';
import type { CoordenadaMapa, PuntoMapa, TipoPuntoMapa } from '../types';

const TAMANO_TILE = 256;
const LATITUD_MAXIMA = 85.05112878;
const CENTRO_INICIAL = { latitude: 22.159, longitude: -102.415 };

interface MapaRealProps {
  markers?: PuntoMapa[];
  routeCoordinates?: CoordenadaMapa[];
  initialCenter?: CoordenadaMapa;
  initialZoom?: number;
  selectedMarkerId?: string;
  onMarkerPress?: (marker: PuntoMapa) => void;
  style?: ViewStyle;
}

interface CamaraMapa {
  center: CoordenadaMapa;
  zoom: number;
}

interface TileMapa {
  key: string;
  uri: string;
  left: number;
  top: number;
}

function aPixel(coordenada: CoordenadaMapa, zoom: number) {
  const latitud = Math.max(-LATITUD_MAXIMA, Math.min(LATITUD_MAXIMA, coordenada.latitude));
  const seno = Math.sin((latitud * Math.PI) / 180);
  const mundo = TAMANO_TILE * 2 ** zoom;
  return {
    x: ((coordenada.longitude + 180) / 360) * mundo,
    y: (0.5 - Math.log((1 + seno) / (1 - seno)) / (4 * Math.PI)) * mundo,
  };
}

function aCoordenada(x: number, y: number, zoom: number): CoordenadaMapa {
  const mundo = TAMANO_TILE * 2 ** zoom;
  const xEnvuelto = ((x % mundo) + mundo) % mundo;
  const yLimitado = Math.max(0, Math.min(mundo, y));
  const longitud = (xEnvuelto / mundo) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * yLimitado) / mundo;
  return {
    latitude: (180 / Math.PI) * Math.atan(Math.sinh(n)),
    longitude: longitud,
  };
}

function colorMarcador(tipo: TipoPuntoMapa) {
  if (tipo === 'Ruta') return colores.marcadorRuta;
  if (tipo === 'Hospedaje') return colores.marcadorHospedaje;
  if (tipo === 'Grupo') return colores.marcadorGrupo;
  return colores.marcadorDestino;
}

function modulo(valor: number, divisor: number) {
  return ((valor % divisor) + divisor) % divisor;
}

export function MapaReal({
  markers = [],
  routeCoordinates = [],
  initialCenter = CENTRO_INICIAL,
  initialZoom = 13,
  selectedMarkerId,
  onMarkerPress,
  style,
}: MapaRealProps) {
  const [camara, setCamara] = useState<CamaraMapa>({
    center: initialCenter,
    zoom: Math.max(3, Math.min(18, initialZoom)),
  });
  const [dimensiones, setDimensiones] = useState({ width: 0, height: 0 });
  const camaraRef = useRef(camara);
  const centroAlIniciarGesto = useRef(camara);
  const [falloCarga, setFalloCarga] = useState(false);

  function actualizarCamara(nueva: CamaraMapa) {
    camaraRef.current = nueva;
    setCamara(nueva);
  }

  function alCambiarTamano(evento: LayoutChangeEvent) {
    const { width, height } = evento.nativeEvent.layout;
    setDimensiones((actual) =>
      actual.width === width && actual.height === height ? actual : { width, height },
    );
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evento, gesto) =>
          Math.abs(gesto.dx) > 5 || Math.abs(gesto.dy) > 5,
        onPanResponderGrant: () => {
          centroAlIniciarGesto.current = camaraRef.current;
        },
        onPanResponderMove: (_evento, gesto) => {
          const centro = aPixel(
            centroAlIniciarGesto.current.center,
            centroAlIniciarGesto.current.zoom,
          );
          actualizarCamara({
            zoom: centroAlIniciarGesto.current.zoom,
            center: aCoordenada(centro.x - gesto.dx, centro.y - gesto.dy, centroAlIniciarGesto.current.zoom),
          });
        },
      }),
    [],
  );

  const tiles = useMemo<TileMapa[]>(() => {
    if (!dimensiones.width || !dimensiones.height) return [];
    const zoom = camara.zoom;
    const centro = aPixel(camara.center, zoom);
    const izquierda = centro.x - dimensiones.width / 2;
    const arriba = centro.y - dimensiones.height / 2;
    const mundoEnTiles = 2 ** zoom;
    const primeraColumna = Math.floor(izquierda / TAMANO_TILE);
    const ultimaColumna = Math.floor((izquierda + dimensiones.width) / TAMANO_TILE);
    const primeraFila = Math.max(0, Math.floor(arriba / TAMANO_TILE));
    const ultimaFila = Math.min(
      mundoEnTiles - 1,
      Math.floor((arriba + dimensiones.height) / TAMANO_TILE),
    );
    const resultado: TileMapa[] = [];

    for (let fila = primeraFila; fila <= ultimaFila; fila += 1) {
      for (let columna = primeraColumna; columna <= ultimaColumna; columna += 1) {
        const x = modulo(columna, mundoEnTiles);
        resultado.push({
          key: `${zoom}-${columna}-${fila}`,
          uri: `https://tile.openstreetmap.org/${zoom}/${x}/${fila}.png`,
          left: columna * TAMANO_TILE - izquierda,
          top: fila * TAMANO_TILE - arriba,
        });
      }
    }

    return resultado;
  }, [camara, dimensiones]);

  const posicionesMarcadores = useMemo(() => {
    const centro = aPixel(camara.center, camara.zoom);
    const origenX = centro.x - dimensiones.width / 2;
    const origenY = centro.y - dimensiones.height / 2;
    const mundo = TAMANO_TILE * 2 ** camara.zoom;
    const marcadoresPorUbicacion = new Map<string, PuntoMapa[]>();

    markers.forEach((marker) => {
      const clave = `${marker.coordenada.latitude.toFixed(5)}:${marker.coordenada.longitude.toFixed(5)}`;
      const grupo = marcadoresPorUbicacion.get(clave) ?? [];
      grupo.push(marker);
      marcadoresPorUbicacion.set(clave, grupo);
    });

    return markers.map((marker) => {
      const pixel = aPixel(marker.coordenada, camara.zoom);
      let x = pixel.x;
      if (x - centro.x > mundo / 2) x -= mundo;
      if (centro.x - x > mundo / 2) x += mundo;
      const clave = `${marker.coordenada.latitude.toFixed(5)}:${marker.coordenada.longitude.toFixed(5)}`;
      const grupo = marcadoresPorUbicacion.get(clave) ?? [];
      const indice = grupo.indexOf(marker);
      const radioAbanico = grupo.length > 1 ? Math.min(64, Math.max(36, grupo.length * 8)) : 0;
      const angulo = (2 * Math.PI * indice) / grupo.length - Math.PI / 2;
      return {
        marker,
        left: x - origenX - 18 + Math.cos(angulo) * radioAbanico,
        top: pixel.y - origenY - 38 + Math.sin(angulo) * radioAbanico,
      };
    });
  }, [camara, dimensiones, markers]);

  const segmentosRuta = useMemo(() => {
    const centro = aPixel(camara.center, camara.zoom);
    const origenX = centro.x - dimensiones.width / 2;
    const origenY = centro.y - dimensiones.height / 2;
    const mundo = TAMANO_TILE * 2 ** camara.zoom;

    return routeCoordinates.slice(1).map((coordenada, indice) => {
      const anterior = aPixel(routeCoordinates[indice], camara.zoom);
      const siguiente = aPixel(coordenada, camara.zoom);
      let xAnterior = anterior.x;
      let xSiguiente = siguiente.x;
      if (xAnterior - centro.x > mundo / 2) xAnterior -= mundo;
      if (centro.x - xAnterior > mundo / 2) xAnterior += mundo;
      if (xSiguiente - centro.x > mundo / 2) xSiguiente -= mundo;
      if (centro.x - xSiguiente > mundo / 2) xSiguiente += mundo;
      const x1 = xAnterior - origenX;
      const y1 = anterior.y - origenY;
      const x2 = xSiguiente - origenX;
      const y2 = siguiente.y - origenY;
      const largo = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const angulo = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
      return { key: `${indice}-${coordenada.latitude}`, left: (x1 + x2 - largo) / 2, top: (y1 + y2) / 2, largo, angulo };
    });
  }, [camara, dimensiones, routeCoordinates]);

  return (
    <View
      style={[estilos.contenedor, style]}
      onLayout={alCambiarTamano}
      {...panResponder.panHandlers}
      accessibilityLabel="Mapa interactivo con OpenStreetMap"
    >
      {tiles.map((tile) => (
        <Image
          key={tile.key}
          source={
            Platform.OS === 'web'
              ? { uri: tile.uri }
              : { uri: tile.uri, headers: { 'User-Agent': 'TrekkoMobile/1.0' } }
          }
          style={[estilos.tile, { left: tile.left, top: tile.top }]}
          contentFit="fill"
          onError={() => setFalloCarga(true)}
        />
      ))}
      {segmentosRuta.map((segmento) => (
        <View
          key={segmento.key}
          pointerEvents="none"
          style={[
            estilos.segmentoRuta,
            {
              left: segmento.left,
              top: segmento.top,
              width: segmento.largo,
              transform: [{ rotate: `${segmento.angulo}deg` }],
            },
          ]}
        />
      ))}
      {posicionesMarcadores.map(({ marker, left, top }) => {
        if (
          left < -40 ||
          top < -45 ||
          left > dimensiones.width + 10 ||
          top > dimensiones.height + 10
        ) {
          return null;
        }
        const seleccionado = selectedMarkerId === marker.id;
        const color = colorMarcador(marker.tipo);
        return (
          <Pressable
            key={marker.id}
            accessibilityRole="button"
            accessibilityLabel={`Marcar ${marker.nombre}`}
            onPress={() => onMarkerPress?.(marker)}
            style={[
              estilos.marcador,
              { left, top, backgroundColor: color },
              seleccionado && estilos.marcadorSeleccionado,
            ]}
          >
            <Feather
              name={marker.tipo === 'Hospedaje' ? 'home' : marker.tipo === 'Ruta' ? 'navigation' : 'map-pin'}
              size={seleccionado ? 19 : 16}
              color="#fff"
            />
          </Pressable>
        );
      })}
      <View style={estilos.controlesZoom}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Acercar mapa"
          onPress={() => actualizarCamara({ ...camaraRef.current, zoom: Math.min(18, camaraRef.current.zoom + 1) })}
          style={estilos.botonZoom}
        >
          <Feather name="plus" size={19} color={colores.mapaIconoOscuro} />
        </Pressable>
        <View style={estilos.divisorZoom} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Alejar mapa"
          onPress={() => actualizarCamara({ ...camaraRef.current, zoom: Math.max(3, camaraRef.current.zoom - 1) })}
          style={estilos.botonZoom}
        >
          <Feather name="minus" size={19} color={colores.mapaIconoOscuro} />
        </Pressable>
      </View>
      <View style={estilos.atribucion} pointerEvents="none">
        <Text style={estilos.textoAtribucion}>© OpenStreetMap contributors</Text>
      </View>
      {falloCarga && (
        <View style={estilos.avisoConexion} pointerEvents="none">
          <Text style={estilos.textoAviso}>No se pudieron cargar algunos mosaicos del mapa.</Text>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    minHeight: 160,
    backgroundColor: colores.mapaFondo,
    overflow: 'hidden',
  },
  tile: {
    width: TAMANO_TILE,
    height: TAMANO_TILE,
    position: 'absolute',
  },
  marcador: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colores.azulProfundo,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.26,
    shadowRadius: 4,
  },
  marcadorSeleccionado: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    zIndex: 5,
  },
  segmentoRuta: {
    position: 'absolute',
    height: 4,
    backgroundColor: colores.marcadorRuta,
    borderRadius: 3,
    zIndex: 1,
  },
  controlesZoom: {
    position: 'absolute',
    right: 12,
    top: 12,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: colores.azulProfundo,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
  },
  botonZoom: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divisorZoom: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colores.mapaControl,
  },
  atribucion: {
    position: 'absolute',
    right: 4,
    bottom: 3,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  textoAtribucion: {
    color: colores.mapaTextoOscuro,
    fontSize: 9,
  },
  avisoConexion: {
    position: 'absolute',
    left: 10,
    right: 62,
    top: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  textoAviso: {
    color: colores.mapaTerracota,
    fontSize: 11,
  },
});
