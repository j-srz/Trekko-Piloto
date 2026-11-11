import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import type { Poi } from '../../../api/pois';
import { colores } from '../../../theme/tokens';

interface MapaNativoProps {
  pois: Poi[];
  center: { latitude: number; longitude: number };
  muestraUbicacion: boolean;
  onPoiPress: (poi: Poi) => void;
  style?: StyleProp<ViewStyle>;
}

export function MapaNativo({
  pois,
  center,
  muestraUbicacion,
  onPoiPress,
  style,
}: MapaNativoProps) {
  return (
    <MapView
      style={style}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={{
        ...center,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }}
      showsUserLocation={muestraUbicacion}
      showsMyLocationButton={muestraUbicacion}
      accessibilityLabel="Mapa de puntos de interés cercanos"
    >
      {pois.map((poi) => (
        <Marker
          key={poi.id}
          coordinate={{ latitude: poi.ubicacion.lat, longitude: poi.ubicacion.lng }}
          title={poi.destacado ? `Destacado: ${poi.nombre}` : poi.nombre}
          description={poi.municipio.nombre}
          pinColor={poi.destacado ? colores.terracota : colores.verdeBoton}
          onPress={() => onPoiPress(poi)}
        />
      ))}
    </MapView>
  );
}
