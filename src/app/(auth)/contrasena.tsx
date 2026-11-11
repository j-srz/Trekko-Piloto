// Pantalla 00_Login_Contraseña: pide la contraseña de un correo ya existente.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { diagnosticoErrorApi, traducirErrorApi } from '../../api';
import { Boton } from '../../components/ui/Boton';
import { CampoTexto } from '../../components/ui/CampoTexto';
import { PantallaAuth } from '../../components/ui/PantallaAuth';

export default function Contrasena() {
  const router = useRouter();
  const { login, loading } = useAuth();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();

  async function entrar() {
    setError(undefined);
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    try {
      await login(email ?? '', password);
      router.replace('/(tabs)/inicio');
    } catch (e) {
      const message = traducirErrorApi(e, 'login');
      setError(__DEV__ ? `${message}\n${diagnosticoErrorApi(e)}` : message);
    }
  }

  return (
    <PantallaAuth
      conAtras
      titulo="¿Cuál es tu contraseña?"
      subtitulo="Hola de nuevo. Ingresa tu contraseña para continuar."
      pie={
        <Boton
          titulo="Iniciar sesión"
          onPress={entrar}
          cargando={loading}
          deshabilitado={password.length < 8}
        />
      }
    >
      {!!error && __DEV__ && (
        <Text accessibilityRole="alert">{error}</Text>
      )}
      <CampoTexto
        etiqueta="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="Ingresa tu contraseña"
        esPassword
        autoCapitalize="none"
        autoComplete="password"
        error={__DEV__ ? undefined : error}
        onSubmitEditing={password.length >= 8 ? entrar : undefined}
      />
    </PantallaAuth>
  );
}