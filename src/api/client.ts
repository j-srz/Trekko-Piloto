import { ApiError, type ApiProblem } from './errors';

export interface TokenStore {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  saveTokens(accessToken: string, refreshToken: string): Promise<void>;
  clear(): Promise<void>;
}

interface ApiClientOptions {
  baseUrl: string;
  tokenStore: TokenStore;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  onSessionExpired?: () => void | Promise<void>;
}

interface RequestOptions {
  authenticated?: boolean;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isTokenResponse(value: unknown): value is TokenResponse {
  if (!isRecord(value)) return false;
  return (
    typeof value.accessToken === 'string' &&
    typeof value.refreshToken === 'string'
  );
}

async function readJson(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body) return undefined;
  try {
    return JSON.parse(body);
  } catch (cause) {
    throw new ApiError(response.status, { title: 'Respuesta inválida del servidor.' }, { cause });
  }
}

function problemFrom(value: unknown): ApiProblem {
  if (!isRecord(value)) return {};
  const body = value;
  const errors: NonNullable<ApiProblem['errors']> = [];
  if (Array.isArray(body.errors)) {
    const entries: unknown[] = body.errors;
    for (const item of entries) {
      if (typeof item === 'string') {
        errors.push(item);
      } else if (isRecord(item)) {
        errors.push({
          field: typeof item.field === 'string' ? item.field : undefined,
          message: typeof item.message === 'string' ? item.message : undefined,
        });
      }
    }
  }
  return {
    code: 'code' in body && typeof body.code === 'string' ? body.code : undefined,
    title: 'title' in body && typeof body.title === 'string' ? body.title : undefined,
    detail: 'detail' in body && typeof body.detail === 'string' ? body.detail : undefined,
    errors: errors.length ? errors : undefined,
  };
}

export function createApiClient({
  baseUrl,
  tokenStore,
  fetcher = fetch,
  timeoutMs = 15_000,
  onSessionExpired,
}: ApiClientOptions) {
  let refreshInFlight: Promise<boolean> | undefined;

  function assertConfiguration(): void {
    if (!baseUrl) {
      throw new ApiError(
        0,
        { detail: 'Configura EXPO_PUBLIC_API_URL con la URL local del backend.' },
        undefined,
        baseUrl,
      );
    }
    if (!baseUrl.endsWith('/api/v1')) {
      throw new ApiError(
        0,
        { detail: 'EXPO_PUBLIC_API_URL debe terminar en /api/v1.' },
        undefined,
        baseUrl,
      );
    }
  }

  async function fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const abortFromRequest = () => controller.abort(init.signal?.reason);
    if (init.signal?.aborted) abortFromRequest();
    else init.signal?.addEventListener('abort', abortFromRequest, { once: true });

    try {
      return await fetcher(url, { ...init, signal: controller.signal });
    } catch (cause) {
      const detail = controller.signal.aborted
        ? `La solicitud agotó el tiempo de espera (${timeoutMs} ms).`
        : 'No pudimos conectar con el servidor.';
      throw new ApiError(0, { detail }, { cause }, url);
    } finally {
      clearTimeout(timeout);
      init.signal?.removeEventListener('abort', abortFromRequest);
    }
  }

  async function send<T>(
    path: string,
    init: RequestInit,
    authenticated: boolean,
    retried = false,
  ): Promise<T> {
    assertConfiguration();
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body != null) headers.set('Content-Type', 'application/json');

    if (authenticated) {
      const accessToken = await tokenStore.getAccessToken();
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const url = `${baseUrl}${path}`;
    const response = await fetchWithTimeout(url, { ...init, headers });

    if (response.status === 401 && authenticated && !retried) {
      if (await renewSession()) return send<T>(path, init, true, true);
    }

    const body = await readJson(response);
    if (!response.ok) throw new ApiError(response.status, problemFrom(body));
    if (response.status === 204) return undefined as T;
    return body as T;
  }

  async function refreshTokens(): Promise<boolean> {
    assertConfiguration();
    const refreshToken = await tokenStore.getRefreshToken();
    if (!refreshToken) return false;

    const url = `${baseUrl}/auth/refresh`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const body = await readJson(response);
    if (!response.ok) throw new ApiError(response.status, problemFrom(body));
    if (!isTokenResponse(body)) {
      throw new ApiError(response.status, { title: 'Respuesta de renovación inválida.' });
    }
    await tokenStore.saveTokens(body.accessToken, body.refreshToken);
    return true;
  }

  function renewSession(): Promise<boolean> {
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        try {
          if (await refreshTokens()) return true;
        } catch (error) {
          await tokenStore.clear();
          await onSessionExpired?.();
          throw error;
        }
        await tokenStore.clear();
        await onSessionExpired?.();
        return false;
      })().finally(() => {
        refreshInFlight = undefined;
      });
    }
    return refreshInFlight;
  }

  return {
    request<T>(
      path: string,
      init: RequestInit = {},
      options: RequestOptions = {},
    ): Promise<T> {
      return send<T>(path, init, options.authenticated ?? false);
    },
  };
}
