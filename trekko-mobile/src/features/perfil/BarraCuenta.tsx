import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, espacio, fuente, radio, sombra } from '../../constants/tokens';

const PESTANAS = [
  { nombre: 'inicio', titulo: 'Inicio', icono: 'home', ruta: '/(tabs)/inicio' },
  { nombre: 'grupos', titulo: 'Grupos', icono: 'users', ruta: '/(tabs)/grupos' },
  { nombre: 'mapa', titulo: 'Mapa', icono: 'map', ruta: '/(tabs)/mapa' },
] as const;

export function BarraCuenta() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[estilos.contenedor, { bottom: insets.bottom + espacio.m }]} pointerEvents="box-none">
      <View style={estilos.pildora}>
        {PESTANAS.map((pestana) => (
          <Pressable
            key={pestana.nombre}
            onPress={() => router.navigate(pestana.ruta)}
            style={({ pressed }) => [estilos.pestana, pressed && estilos.presionado]}
            accessibilityRole="tab"
            accessibilityLabel={pestana.titulo}
          >
            <Feather name={pestana.icono} size={18} color={colores.gris} />
            <Text style={estilos.etiqueta}>{pestana.titulo}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() => router.navigate('/perfil')}
        style={({ pressed }) => [estilos.perfilActivo, pressed && estilos.presionado]}
        accessibilityRole="button"
        accessibilityLabel="Mi cuenta"
      >
        <Feather name="user" size={20} color={colores.azulProfundo} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    left: espacio.xl,
    right: espacio.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
  },
  pildora: {
    flex: 1,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: espacio.s,
    borderRadius: radio.chip,
    backgroundColor: colores.tarjeta,
    ...sombra.nivel2,
  },
  pestana: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radio.chip,
  },
  etiqueta: { fontFamily: fuente.medium, fontSize: 9, color: colores.gris },
  perfilActivo: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: colores.tarjeta,
    borderWidth: 2,
    borderColor: colores.grisSuave,
    ...sombra.nivel2,
  },
  presionado: { opacity: 0.7 },
});
