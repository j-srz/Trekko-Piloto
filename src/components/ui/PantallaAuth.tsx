import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colores, espacio, texto } from '../../constants/tokens';

type Props = {
  titulo: string;
  subtitulo?: string;
  conAtras?: boolean;
  /** Centra todo el contenido verticalmente en la pantalla. */
  centrado?: boolean;
  children: ReactNode;
  /** Zona fija inferior (botón principal). */
  pie?: ReactNode;
};

export function PantallaAuth({
  titulo,
  subtitulo,
  conAtras,
  centrado,
  children,
  pie,
}: Props) {
  const router = useRouter();

  return (
    <SafeAreaView style={s.pantalla}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[s.contenido, centrado && s.centrado]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {conAtras && (
            <Pressable
              onPress={() => router.back()}
              style={s.atras}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Ionicons name="chevron-back" size={24} color={colores.azulProfundo} />
            </Pressable>
          )}

          {/* Espacio del tamaño del botón de regreso, para que el título
              quede a la misma altura en todas las pantallas */}
          {!conAtras && !centrado && <View style={s.espacioAtras} />}

          <View style={{ gap: espacio.s }}>
            <Text style={texto.h1}>{titulo}</Text>
            {!!subtitulo && <Text style={texto.cuerpoGrande}>{subtitulo}</Text>}
          </View>

          <View style={{ gap: espacio.l, marginTop: espacio.xl }}>{children}</View>
        </ScrollView>

        {pie && <View style={s.pie}>{pie}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { flexGrow: 1, padding: espacio.xl, paddingTop: espacio.l },
  centrado: { justifyContent: 'center', paddingBottom: espacio.xxxl },
  atras: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    marginBottom: espacio.xl,
  },
  espacioAtras: { height: 48, marginBottom: espacio.xl },
  pie: { padding: espacio.xl, paddingTop: espacio.m },
});