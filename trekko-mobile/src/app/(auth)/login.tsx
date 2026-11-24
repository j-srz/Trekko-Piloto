// Pantalla 00_Auth_Acceso: pide el correo.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { AccesoAlternativo } from '../../components/ui/AccesoAlternativo';
import { Boton } from '../../components/ui/Boton';
import { CampoTexto } from '../../components/ui/CampoTexto';
import { PantallaAuth } from '../../components/ui/PantallaAuth';
import { colores, espacio, texto } from '../../constants/tokens';

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();

  function proximamente(proveedor: string) {
    Alert.alert(
      'Próximamente',
      `El acceso con ${proveedor} llegará en una próxima versión.`,
    );
  }

  async function continuar() {
    setError(undefined);
    if (!CORREO_VALIDO.test(email.trim())) {
      setError('Escribe un correo válido, por ejemplo nombre@correo.com.');
      return;
    }
    router.push({ pathname: '/contrasena', params: { email: email.trim().toLowerCase() } });
  }

  return (
    <PantallaAuth
      centrado
      titulo={'Hola, viajero.\n¿Estás listo?'}
      subtitulo="Descubre y planea tu próxima ruta."
    >
      <CampoTexto
        etiqueta="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        placeholder="nombre@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={error}
        onSubmitEditing={continuar}
      />

      <Boton
        titulo="Continuar"
        onPress={continuar}
        deshabilitado={email.trim().length === 0}
      />

      <Pressable
        onPress={() => router.push('/registro' as never)}
        style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: espacio.s }}
        accessibilityRole="button"
        accessibilityLabel="Crear una cuenta nueva"
      >
        <Text style={[texto.etiqueta, { color: colores.verdeBoton }]}>Crear cuenta</Text>
      </Pressable>

      <AccesoAlternativo
        onGoogle={() => proximamente('Google')}
        onApple={() => proximamente('Apple')}
      />
    </PantallaAuth>
  );
}