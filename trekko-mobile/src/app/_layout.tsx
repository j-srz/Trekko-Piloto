import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { EstadoCarga } from '../components/ui/EstadoCarga';
import { EstadoError } from '../components/ui/EstadoError';
import { AuthProvider, useAuth } from '../auth/AuthProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavegacionProtegida />
    </AuthProvider>
  );
}

function NavegacionProtegida() {
  const router = useRouter();
  const segments = useSegments();
  const { user, initialized, error, retrySession } = useAuth();
  const group = segments[0];

  useEffect(() => {
    if (!initialized || error) return;
    if (user && group === '(auth)') router.replace('/(tabs)/inicio');
    else if (!user && group !== '(auth)') router.replace('/login');
  }, [error, group, initialized, router, user]);

  if (!initialized) return <EstadoCarga mensaje="Revisando tu sesión..." />;
  if (error) return <EstadoError mensaje={error} onReintentar={retrySession} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}