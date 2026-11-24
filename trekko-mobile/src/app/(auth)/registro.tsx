import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { diagnosticoErrorApi, traducirErrorApi } from '../../api';
import { useAuth } from '../../auth/AuthProvider';
import { Boton } from '../../components/ui/Boton';
import { CampoTexto } from '../../components/ui/CampoTexto';
import { PantallaAuth } from '../../components/ui/PantallaAuth';
import { colores, texto } from '../../constants/tokens';

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Registro() {
  const router = useRouter();
  const { register, loading } = useAuth();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();

  async function crearCuenta() {
    setError(undefined);
    if (!nombre.trim()) {
      setError('Escribe tu nombre para continuar.');
      return;
    }
    if (!CORREO_VALIDO.test(correo.trim())) {
      setError('Escribe un correo válido.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    try {
      await register({ nombre: nombre.trim(), correo: correo.trim().toLowerCase(), password });
      router.replace('/(tabs)/inicio');
    } catch (cause) {
      const message = traducirErrorApi(cause, 'register');
      setError(__DEV__ ? `${message}\n${diagnosticoErrorApi(cause)}` : message);
    }
  }

  return (
    <PantallaAuth
      conAtras
      titulo="Crea tu cuenta"
      subtitulo="Planea tu próxima aventura con Trekko."
      pie={
        <Boton
          titulo="Crear cuenta"
          onPress={crearCuenta}
          cargando={loading}
          deshabilitado={!nombre.trim() || !correo.trim() || password.length < 8}
        />
      }
    >
      {!!error && <Text style={[texto.cuerpo, { color: colores.error }]} accessibilityRole="alert">{error}</Text>}
      <CampoTexto
        etiqueta="Nombre"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Tu nombre"
        autoCapitalize="words"
        autoComplete="name"
        error={error?.includes('nombre') ? error : undefined}
      />
      <CampoTexto
        etiqueta="Correo electrónico"
        value={correo}
        onChangeText={setCorreo}
        placeholder="nombre@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={error?.includes('correo') ? error : undefined}
      />
      <CampoTexto
        etiqueta="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="Mínimo 8 caracteres"
        esPassword
        autoCapitalize="none"
        autoComplete="new-password"
        error={error?.includes('contraseña') ? error : undefined}
      />
    </PantallaAuth>
  );
}
