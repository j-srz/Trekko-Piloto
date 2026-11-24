import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { ALTO_CONTROL, MIN_AREA_TACTIL, colores, espacio, fuente, radio, texto } from '../../constants/tokens';

type Props = Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'placeholder' | 'keyboardType' | 'autoCapitalize' | 'autoComplete' | 'onSubmitEditing' | 'editable'
> & {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  esPassword?: boolean;
};

export function CampoTexto({ etiqueta, ayuda, error, esPassword, ...resto }: Props) {
  const [enFoco, setEnFoco] = useState(false);
  const [oculto, setOculto] = useState(true);

  return (
    <View style={{ gap: 6 }}>
      <Text style={texto.etiqueta}>{etiqueta}</Text>
      <View style={[s.caja, enFoco && s.enFoco, !!error && s.conError]}>
        <TextInput
          {...resto}
          style={s.input}
          placeholderTextColor={colores.gris}
          secureTextEntry={esPassword && oculto}
          autoCorrect={false}
          onFocus={() => setEnFoco(true)}
          onBlur={() => setEnFoco(false)}
          accessibilityLabel={etiqueta}
        />
        {esPassword && (
          <Pressable
            onPress={() => setOculto((v) => !v)}
            style={s.togglePassword}
            accessibilityLabel={oculto ? 'Mostrar contraseña' : 'Ocultar contraseña'}
            accessibilityRole="button"
            accessibilityState={{ selected: !oculto }}
          >
            <Ionicons name={oculto ? 'eye-outline' : 'eye-off-outline'} size={22} color={colores.gris} />
          </Pressable>
        )}
        {!!error && !esPassword && <Ionicons name="alert-circle-outline" size={22} color={colores.error} />}
      </View>
      {!!error && <Text style={[texto.micro, { color: colores.error }]}>{error}</Text>}
      {!error && !!ayuda && <Text style={texto.micro}>{ayuda}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ALTO_CONTROL,
    paddingHorizontal: espacio.m,
    borderRadius: radio.campo,
    borderWidth: 1.5,
    borderColor: colores.borde,
    backgroundColor: colores.tarjeta,
    gap: 8,
  },
  enFoco: { borderColor: colores.verde },
  conError: { borderColor: colores.error },
  input: { flex: 1, fontFamily: fuente.regular, fontSize: 16, color: colores.textoOscuro },
  togglePassword: { minWidth: MIN_AREA_TACTIL, minHeight: MIN_AREA_TACTIL, alignItems: 'center', justifyContent: 'center' },
});