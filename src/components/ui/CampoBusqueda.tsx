/**
 * CampoBusqueda — barra de búsqueda con dos modos:
 *
 *   · Reposo (vacía y sin foco): lupa + "¿A dónde vamos...?" centrados.
 *   · Activa (con foco o con texto): el bloque se desliza a la izquierda
 *     y el usuario escribe justo donde estaba el texto.
 *
 * El TextInput real está siempre montado. El bloque lupa + texto es una
 * capa encima que solo se desplaza (no recibe toques), así que la
 * transición es una sola animación continua.
 */

import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  colores,
  espacio,
  fuente,
  MIN_AREA_TACTIL,
  sombra,
} from '../../constants/tokens';

const ALTO_CAMPO = 58;
const TAMANO_LUPA = 22;
const ESPACIO_LUPA = espacio.m;
const DURACION_MS = 260;

interface CampoBusquedaProps {
  valor: string;
  onCambio: (texto: string) => void;
  placeholder?: string;
}

export function CampoBusqueda({
  valor,
  onCambio,
  placeholder = '¿A dónde vamos...?',
}: CampoBusquedaProps) {
  const [enFoco, setEnFoco] = useState(false);
  const [cursorListo, setCursorListo] = useState(false);
  const reducirMovimiento = useReducedMotion();

  // Activa si el usuario tocó el campo o si ya hay texto escrito
  const activa = enFoco || valor.length > 0;

  // 0 = reposo (centrado), 1 = activa (a la izquierda)
  const progreso = useSharedValue(0);
  const anchoZona = useSharedValue(0);
  const anchoBloque = useSharedValue(0);

  useEffect(() => {
    progreso.value = withTiming(activa ? 1 : 0, {
      duration: reducirMovimiento ? 0 : DURACION_MS,
      easing: Easing.out(Easing.cubic),
    });

    const duracion = reducirMovimiento ? 0 : DURACION_MS;
    if (!activa) setCursorListo(false);
    const temporizador = setTimeout(() => {
      if (activa) setCursorListo(true);
    }, duracion);
    return () => clearTimeout(temporizador);
  }, [activa, reducirMovimiento, progreso]);

  const estiloBloque = useAnimatedStyle(() => {
    const medido = anchoZona.value > 0 && anchoBloque.value > 0;
    const centrado = (anchoZona.value - anchoBloque.value) / 2;
    return {
      // Invisible hasta medir, para que no haya un salto al aparecer
      opacity: medido ? 1 : 0,
      transform: [{ translateX: centrado * (1 - progreso.value) }],
    };
  });

  return (
    <View style={estilos.contenedor}>
      {/* Zona de escritura: aquí viven el campo real y el bloque animado */}
      <View
        style={estilos.zona}
        onLayout={(e) => {
          anchoZona.value = e.nativeEvent.layout.width;
        }}
      >
        <TextInput
          style={estilos.entrada}
          value={valor}
          onChangeText={onCambio}
          onFocus={() => setEnFoco(true)}
          onBlur={() => setEnFoco(false)}
          returnKeyType="search"
          selectionColor={cursorListo ? colores.verde : 'transparent'}
          cursorColor={cursorListo ? colores.verde : 'transparent'}
          clearButtonMode="never" // manejamos el botón manualmente para Android
          accessibilityLabel="Campo de búsqueda"
          accessibilityHint={placeholder}
        />

        {/* Bloque lupa + texto: decorativo y no intercepta toques */}
        <Animated.View
          pointerEvents="none"
          style={[estilos.bloque, estiloBloque]}
          onLayout={(e) => {
            anchoBloque.value = e.nativeEvent.layout.width;
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Feather
            name="search"
            size={TAMANO_LUPA}
            color={colores.gris}
            style={{ marginRight: ESPACIO_LUPA }}
          />
          <Text
            style={[
              estilos.textoPlaceholder,
              valor.length > 0 && { opacity: 0 },
            ]}
            numberOfLines={1}
          >
            {placeholder}
          </Text>
        </Animated.View>
      </View>

      {/* Botón ✕ — solo visible cuando hay texto */}
      {valor.length > 0 && (
        <Pressable
          onPress={() => onCambio('')}
          style={estilos.botonBorrar}
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
          hitSlop={8}
        >
          <Feather name="x-circle" size={20} color={colores.gris} />
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.tarjeta,
    height: ALTO_CAMPO,
    borderRadius: ALTO_CAMPO / 2, // píldora completa
    paddingHorizontal: espacio.xl,
    ...sombra.nivel1,
  },
  zona: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  entrada: {
    height: '100%',
    // Deja sitio a la lupa: el texto escrito empieza donde estaba el placeholder
    paddingLeft: TAMANO_LUPA + ESPACIO_LUPA,
    paddingVertical: 0, // evita relleno extra en Android
    fontFamily: fuente.regular,
    fontSize: 16,
    color: colores.textoOscuro,
  },
  bloque: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoPlaceholder: {
    fontFamily: fuente.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colores.gris,
  },
  botonBorrar: {
    marginLeft: espacio.s,
    marginRight: -espacio.s, // compensa el ancho mínimo táctil
    minWidth: MIN_AREA_TACTIL,
    height: MIN_AREA_TACTIL,
    alignItems: 'center',
    justifyContent: 'center',
  },
});