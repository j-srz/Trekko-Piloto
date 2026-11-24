import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { ALTO_CONTROL, colores, espacio, fuente, radio } from '../../constants/tokens';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'texto';
  deshabilitado?: boolean;
  cargando?: boolean;
  accessibilityLabel?: string;
};

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  deshabilitado,
  cargando,
  accessibilityLabel = titulo,
}: Props) {
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(inactivo), busy: Boolean(cargando) }}
      style={({ pressed }) => [
        s.base,
        variante === 'primario' && s.primario,
        variante === 'secundario' && s.secundario,
        variante === 'primario' && pressed && { backgroundColor: colores.verdePresionado },
        variante !== 'primario' && pressed && { backgroundColor: colores.grisPresionado },
        deshabilitado && variante === 'primario' && s.primarioOff,
        deshabilitado && variante === 'secundario' && s.secundarioOff,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={variante === 'primario' ? colores.blanco : colores.verdeBoton} />
      ) : (
        <Text
          style={[
            s.texto,
            variante === 'primario' && { color: colores.blanco },
            variante !== 'primario' && { color: colores.azulProfundo },
            deshabilitado && { color: colores.deshabilitadoTexto },
          ]}
        >
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { minHeight: ALTO_CONTROL, borderRadius: radio.boton, alignItems: 'center', justifyContent: 'center', paddingHorizontal: espacio.l },
  primario: { backgroundColor: colores.verdeBoton },
  primarioOff: { backgroundColor: colores.deshabilitadoFondo },
  secundario: { borderWidth: 1.5, borderColor: colores.azulProfundo, backgroundColor: colores.tarjeta },
  secundarioOff: { borderColor: colores.borde },
  texto: { fontFamily: fuente.semibold, fontSize: 16 },
});