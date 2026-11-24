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

interface TimedResponse {
  response: Response;
  signal: AbortSignal;
  finish: () => void;
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
  ): Promise<TimedResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const abortFromRequest = () => controller.abort(init.signal?.reason);
    const finish = () => {
      clearTimeout(timeout);
      init.signal?.removeEventListener('abort', abortFromRequest);
    };
    if (init.signal?.aborted) abortFromRequest();
    else init.signal?.addEventListener('abort', abortFromRequest, { once: true });

    try {
      return {
        response: await fetcher(url, { ...init, signal: controller.signal }),
        signal: controller.signal,
        finish,
      };
    } catch (cause) {
      const detail = controller.signal.aborted
        ? `La solicitud agotó el tiempo de espera (${timeoutMs} ms).`
        : 'No pudimos conectar con el servidor.';
      finish();
      throw new ApiError(0, { detail }, { cause }, url);
    }
  }

  async function readTimedJson(
    timed: TimedResponse,
    url: string,
  ): Promise<unknown> {
    let rejectOnAbort: (() => void) | undefined;
    const aborted = new Promise<never>((_resolve, reject) => {
      rejectOnAbort = () => reject(new Error('Request aborted'));
      if (timed.signal.aborted) rejectOnAbort();
      else timed.signal.addEventListener('abort', rejectOnAbort, { once: true });
    });

    try {
      return await Promise.race([readJson(timed.response), aborted]);
    } catch (cause) {
      if (cause instanceof ApiError) throw cause;
      const detail = timed.signal.aborted
        ? `La solicitud agotó el tiempo de espera (${timeoutMs} ms).`
        : 'No pudimos conectar con el servidor.';
      throw new ApiError(0, { detail }, { cause }, url);
    } finally {
      if (rejectOnAbort) timed.signal.removeEventListener('abort', rejectOnAbort);
      timed.finish();
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
    const timed = await fetchWithTimeout(url, { ...init, headers });
    const { response } = timed;

    if (response.status === 401 && authenticated && !retried) {
      try {
        if (await renewSession()) {
          timed.finish();
          return send<T>(path, init, true, true);
        }
      } catch (error) {
        timed.finish();
        throw error;
      }
    }

    const body = await readTimedJson(timed, url);
    if (!response.ok) throw new ApiError(response.status, problemFrom(body));
    if (response.status === 204) return undefined as T;
    return body as T;
  }

  async function refreshTokens(): Promise<boolean> {
    assertConfiguration();
    const refreshToken = await tokenStore.getRefreshToken();
    if (!refreshToken) return false;

    const url = `${baseUrl}/auth/refresh`;
    const timed = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const { response } = timed;

    const body = await readTimedJson(timed, url);
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
