import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../../components/ui/Card';
import { colores, espacio, fuente, radio, tarjetaAncho, texto } from '../../../theme/tokens';
import { formatearPrecio } from '../../../utils/formato';
import type { RouteSummary } from '../../../api/routes';

interface TarjetaRutaOriginalProps {
  ruta: RouteSummary;
  onPress: () => void;
}

export function TarjetaRutaOriginal({ ruta, onPress }: TarjetaRutaOriginalProps) {
  const duracion = formatearDuracion(ruta.duracionMin);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${ruta.titulo}, ${ruta.municipio.nombre}, ${duracion}, ${formatearPrecio(ruta.costoEstimado)}`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card style={styles.card}>
        <View style={styles.heading}>
          <Text style={styles.badge}>TREKKO ORIGINAL</Text>
          <Feather name="arrow-up-right" size={18} color={colores.azulProfundo} />
        </View>
        <Text style={styles.title}>{ruta.titulo}</Text>
        <View style={styles.details}>
          <Dato icono="map-pin" valor={ruta.municipio.nombre} />
          <Dato icono="clock" valor={duracion} />
          <Dato icono="dollar-sign" valor={formatearPrecio(ruta.costoEstimado)} />
        </View>
      </Card>
    </Pressable>
  );
}

export function formatearDuracion(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  if (horas === 0) return `${minutosRestantes} min`;
  return minutosRestantes ? `${horas} h ${minutosRestantes} min` : `${horas} h`;
}

function Dato({ icono, valor }: { icono: 'map-pin' | 'clock' | 'dollar-sign'; valor: string }) {
  return (
    <View style={styles.detail}>
      <Feather name={icono} size={14} color={colores.gris} accessibilityElementsHidden importantForAccessibility="no" />
      <Text style={styles.detailText}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: tarjetaAncho.ruta, minHeight: 145, justifyContent: 'space-between' },
  pressed: { opacity: 0.8 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    color: colores.azulProfundo,
    backgroundColor: colores.terracotaClaro,
    borderRadius: radio.insignia,
    paddingHorizontal: espacio.s,
    paddingVertical: espacio.xs,
    fontFamily: fuente.semibold,
    fontSize: 11,
  },
  title: { ...texto.h3, marginVertical: espacio.s },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.m },
  detail: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  detailText: { ...texto.micro, color: colores.azulProfundo },
});
