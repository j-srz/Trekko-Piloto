import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { apiGet, apiPost, ApiError, traducirErrorApi } from '../api';
import type { AuthTokens, LoginRequest, RegisterRequest, UserProfile } from '../api/types';
import { onSessionExpired } from './sessionEvents';
import { secureTokenStore } from '../api/secureTokens';

interface AuthContextValue {
  user: UserProfile | null;
  initialized: boolean;
  loading: boolean;
  error?: string;
  login: (correo: string, password: string) => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  retrySession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function readTokens(value: unknown): AuthTokens {
  if (
    isRecord(value) &&
    typeof value.accessToken === 'string' &&
    typeof value.refreshToken === 'string'
  ) {
    return { accessToken: value.accessToken, refreshToken: value.refreshToken };
  }
  throw new ApiError(502, { detail: 'El servidor devolvió una sesión inválida.' });
}

function readUser(value: unknown): UserProfile {
  if (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.nombre === 'string' &&
    typeof value.correo === 'string'
  ) {
    return { id: value.id, nombre: value.nombre, correo: value.correo };
  }
  throw new ApiError(502, { detail: 'El servidor devolvió un perfil inválido.' });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const sessionExpired = useRef(false);

  const loadSession = useCallback(async (keepError = false) => {
    let hasStoredSession = false;
    try {
      const accessToken = await secureTokenStore.getAccessToken();
      const refreshToken = await secureTokenStore.getRefreshToken();
      hasStoredSession = Boolean(accessToken || refreshToken);
      setLoading(true);
      if (!keepError) setError(undefined);
      if (!accessToken && !refreshToken) {
        setUser(null);
        setError(undefined);
        return;
      }
      setUser(readUser(await apiGet<unknown>('/auth/me', true)));
      setError(undefined);
    } catch (cause) {
      const sessionWasExpired = sessionExpired.current;
      if (hasStoredSession && !sessionWasExpired && cause instanceof ApiError && cause.status === 0) {
        setUser({
          id: 'offline-session',
          nombre: 'Perfil sin conexión',
          correo: 'Conéctate para actualizar los datos de tu cuenta.',
        });
        setError(undefined);
      } else {
        setUser(null);
        setError(sessionWasExpired ? undefined : traducirErrorApi(cause));
      }
      sessionExpired.current = false;
    } finally {
      setInitialized(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      sessionExpired.current = true;
      setUser(null);
      setError(undefined);
      setInitialized(true);
      setLoading(false);
    });
    const timer = setTimeout(() => void loadSession(), 0);
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [loadSession]);

  const login = useCallback(async (correo: string, password: string) => {
    setLoading(true);
    setError(undefined);
    let tokensSaved = false;
    try {
      const response = await apiPost<unknown, LoginRequest>('/auth/login', { correo, password });
      const tokens = readTokens(response);
      tokensSaved = true;
      await secureTokenStore.saveTokens(tokens.accessToken, tokens.refreshToken);
      setUser(readUser(await apiGet<unknown>('/auth/me', true)));
    } catch (cause) {
      if (tokensSaved) await secureTokenStore.clear();
      throw cause;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (input: RegisterRequest) => {
    setLoading(true);
    setError(undefined);
    let tokensSaved = false;
    try {
      await apiPost<unknown, RegisterRequest>('/auth/register', input);
      const response = await apiPost<unknown, LoginRequest>('/auth/login', {
        correo: input.correo,
        password: input.password,
      });
      const tokens = readTokens(response);
      tokensSaved = true;
      await secureTokenStore.saveTokens(tokens.accessToken, tokens.refreshToken);
      setUser(readUser(await apiGet<unknown>('/auth/me', true)));
    } catch (cause) {
      if (tokensSaved) await secureTokenStore.clear();
      throw cause;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const refreshToken = await secureTokenStore.getRefreshToken();
      if (refreshToken) {
        await apiPost<undefined, { refreshToken: string }>(
          '/auth/logout?all=false',
          { refreshToken },
          true,
        );
      }
    } finally {
      try {
        await secureTokenStore.clear();
      } finally {
        setUser(null);
        setLoading(false);
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        initialized,
        loading,
        error,
        login,
        register,
        logout,
        retrySession: () => void loadSession(true),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
