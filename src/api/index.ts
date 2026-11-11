import { createApiClient } from './client';
import { ApiError, diagnosticoErrorApi, traducirErrorApi } from './errors';
import { secureTokenStore } from './secureTokens';
import { notifySessionExpired } from '../auth/sessionEvents';

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

const client = createApiClient({
  baseUrl: configuredUrl ?? '',
  tokenStore: secureTokenStore,
  onSessionExpired: notifySessionExpired,
});

export function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  authenticated = false,
): Promise<T> {
  return client.request<T>(path, init, { authenticated });
}

export function apiGet<T>(path: string, authenticated = false): Promise<T> {
  return apiRequest<T>(path, { method: 'GET' }, authenticated);
}

export function apiPost<T, TBody>(
  path: string,
  body: TBody,
  authenticated = false,
): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) }, authenticated);
}

export { ApiError, diagnosticoErrorApi, traducirErrorApi };
