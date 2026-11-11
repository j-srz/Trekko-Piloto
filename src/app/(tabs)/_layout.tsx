/**
 * Layout de pestañas con barra inferior personalizada.
 *
 * Estructura visual:
 *
 *   ┌────────────────────────────────────────┐
 *   │  [Inicio]  [Grupos]  [Mapa]       [○]  │  ← barra flotante
 *   └────────────────────────────────────────┘
 *
 *   · Píldora flotante (fondo blanco, sombra nivel 2)
 *   · Las tres pestañas están dentro de la píldora
 *   · El círculo de perfil está fuera de la píldora, a la derecha
 *   · Posición absoluta con margen inferior del área segura
 *   · El contenido de cada pantalla recibe un paddingBottom igual a
 *     ALTO_BARRA + MARGEN_BARRA para que nada quede tapado
 *
 * La altura de la barra se exporta para que las pantallas puedan
 * calcular su padding inferior.
 */

import { Feather } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, espacio, fuente, radio, sombra } from '../../constants/tokens';

// ─── Constantes de la barra ───────────────────────────────────────────────────
const ALTO_PILULA = 64;
const MARGEN_BARRA = 12; // distancia entre la píldora y el borde inferior
/** Exportada para que las pantallas ajusten su paddingBottom. */
export const ALTO_BARRA_TABS = ALTO_PILULA + MARGEN_BARRA;

// ─── Definición de pestañas ───────────────────────────────────────────────────
const TABS = [
  { nombre: 'inicio', ruta: '/(tabs)/inicio', etiqueta: 'Inicio', icono: 'home' },
  { nombre: 'grupos', ruta: '/(tabs)/grupos', etiqueta: 'Grupos', icono: 'users' },
  { nombre: 'mapa', ruta: '/(tabs)/mapa', etiqueta: 'Mapa', icono: 'map' },
] as const;

type NombreIcono = (typeof TABS)[number]['icono'];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BarraPersonalizada {...props} />}
    >
      <Tabs.Screen name="inicio" />
      <Tabs.Screen name="grupos" />
      <Tabs.Screen name="mapa" />
    </Tabs>
  );
}

// ─── Barra personalizada ──────────────────────────────────────────────────────

function BarraPersonalizada({
  state,
}: {
  state: { index: number; routes: Array<{ name: string }> };
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Margen inferior = área segura del dispositivo + nuestro margen extra
  const margenInferior = insets.bottom + MARGEN_BARRA;

  const rutaActual = state.routes[state.index].name;



  return (
    <View
      style={[estilos.barraContenedor, { bottom: margenInferior }]}
      pointerEvents="box-none"
    >
      {/* ── Píldora con las tres pestañas ── */}
      <View style={estilos.pilula}>
        {TABS.map((tab) => {
          const activa = rutaActual === tab.nombre;
          return (
            <PestanaItem
              key={tab.nombre}
              etiqueta={tab.etiqueta}
              icono={tab.icono}
              activa={activa}
              onPress={() => router.navigate(tab.ruta)}
            />
          );
        })}
      </View>

      {/* ── Círculo de perfil (fuera de la píldora) ── */}
      <Pressable
        onPress={() => router.push('/perfil' as never)}
        style={({ pressed }) => [
          estilos.circuloPerfil,
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Mi perfil"
      >
        <Feather name="user" size={20} color={colores.azulProfundo} />
      </Pressable>
    </View>
  );
}

// ─── Ítem individual de pestaña ───────────────────────────────────────────────

function PestanaItem({
  etiqueta,
  icono,
  activa,
  onPress,
}: {
  etiqueta: string;
  icono: NombreIcono;
  activa: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        estilos.pestana,
        activa && estilos.pestanaActiva,
        pressed && !activa && { opacity: 0.7 },
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: activa }}
      accessibilityLabel={etiqueta}
    >
      <Feather
        name={icono}
        size={20}
        color={activa ? colores.azulProfundo : colores.gris}
      />
      <Text style={[estilos.etiqueta, activa && estilos.etiquetaActiva]}>
        {etiqueta}
      </Text>
    </Pressable>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const estilos = StyleSheet.create({
  barraContenedor: {
    position: 'absolute',
    left: espacio.xl,
    right: espacio.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    // Necesario en Android para que los toques pasen a través del área transparente
    ...Platform.select({ android: { elevation: 0 } }),
  },
  pilula: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colores.tarjeta,
    borderRadius: radio.chip, // totalmente redondo
    height: ALTO_PILULA,
    paddingHorizontal: espacio.s,
    ...sombra.nivel2,
  },
  pestana: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',

    gap: espacio.xs,
    height: ALTO_PILULA - espacio.s * 2,
    borderRadius: radio.chip,
    paddingHorizontal: espacio.m,
  },
  pestanaActiva: {
    backgroundColor: colores.grisSuave,
  },
  etiqueta: {
    fontFamily: fuente.medium,
    fontSize: 10,
    lineHeight: 14,
    color: colores.gris,
  },
  etiquetaActiva: {
    color: colores.azulProfundo,
    fontFamily: fuente.semibold,
  },
  circuloPerfil: {
    width: ALTO_PILULA,
    height: ALTO_PILULA,
    borderRadius: ALTO_PILULA / 2,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombra.nivel2,
  },
});
