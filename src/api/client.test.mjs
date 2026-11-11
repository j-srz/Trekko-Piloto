import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApiClient } from './client.ts';
import { ApiError, traducirErrorApi } from './errors.ts';

test('renueva una sola vez cuando varias solicitudes reciben 401', async () => {
  let accessToken = 'vencido';
  let refreshToken = 'refresh-inicial';
  let refreshCalls = 0;
  let expiredCalls = 0;

  const fetcher = async (input, init) => {
    if (String(input).endsWith('/auth/refresh')) {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return Response.json({ accessToken: 'nuevo', refreshToken: 'refresh-nuevo' });
    }

    const authorization = new Headers(init?.headers).get('Authorization');
    if (authorization === 'Bearer vencido') return Response.json({}, { status: 401 });
    return Response.json({ ok: true });
  };
  const client = createApiClient({
    baseUrl: 'http://localhost/api/v1',
    fetcher,
    tokenStore: {
      async getAccessToken() { return accessToken; },
      async getRefreshToken() { return refreshToken; },
      async saveTokens(nextAccess, nextRefresh) {
        accessToken = nextAccess;
        refreshToken = nextRefresh;
      },
      async clear() {
        accessToken = '';
        refreshToken = '';
      },
    },
    onSessionExpired: () => { expiredCalls += 1; },
  });

  const results = await Promise.all([
    client.request('/auth/me', {}, { authenticated: true }),
    client.request('/auth/me', {}, { authenticated: true }),
  ]);

  assert.deepEqual(results, [{ ok: true }, { ok: true }]);
  assert.equal(refreshCalls, 1);
  assert.equal(expiredCalls, 0);
  assert.equal(accessToken, 'nuevo');
});

test('traduce 401 de login de forma genérica y errores 429', () => {
  assert.equal(
    traducirErrorApi(new ApiError(401, { detail: 'Email is unknown' }), 'login'),
    'Correo o contraseña incorrectos.',
  );
  assert.match(
    traducirErrorApi(new ApiError(429, { code: 'TOO_MANY_REQUESTS' })),
    /demasiados intentos/i,
  );
  assert.match(
    traducirErrorApi(new ApiError(423, { code: 'ACCOUNT_LOCKED' })),
    /bloqueada/i,
  );
  assert.match(
    traducirErrorApi(new ApiError(409, { code: 'CONFLICT' }), 'register'),
    /iniciar sesión/i,
  );
});

test('cancela solicitudes que superan el timeout y muestra su URL', async () => {
  const client = createApiClient({
    baseUrl: 'http://192.168.3.7:3000/api/v1',
    timeoutMs: 10,
    fetcher: (_input, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }),
    tokenStore: {
      async getAccessToken() { return null; },
      async getRefreshToken() { return null; },
      async saveTokens() {},
      async clear() {},
    },
  });

  await assert.rejects(
    client.request('/auth/login'),
    (error) => {
      assert.equal(error.status, 0);
      assert.equal(error.requestUrl, 'http://192.168.3.7:3000/api/v1/auth/login');
      assert.match(error.problem.detail, /tiempo de espera/i);
      return true;
    },
  );
});
