export interface ApiProblem {
  code?: string;
  title?: string;
  detail?: string;
  errors?: (string | { field?: string; message?: string })[];
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ApiProblem = {},
    options?: ErrorOptions,
    readonly requestUrl?: string,
  ) {
    super(problem.detail || problem.title || 'Ocurrió un error al comunicarse con el servidor.', options);
    this.name = 'ApiError';
  }

  get code(): string | undefined {
    return this.problem.code;
  }
}

export type ApiErrorContext = 'login' | 'register' | 'default';

export function traducirErrorApi(error: unknown, context: ApiErrorContext = 'default'): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }

  if (error.status === 401 && context === 'login') {
    return 'Correo o contraseña incorrectos.';
  }
  if (error.status === 409 && context === 'register') {
    return 'Ya existe una cuenta con ese correo. Intenta iniciar sesión.';
  }
  if (error.status === 423) {
    return 'Tu cuenta está temporalmente bloqueada. Inténtalo más tarde.';
  }
  if (error.status === 404) {
    return 'No encontramos este contenido.';
  }
  if (error.status === 429) {
    return 'Has realizado demasiados intentos. Espera un momento y vuelve a intentarlo.';
  }
  if (error.status === 400) {
    return 'Revisa los datos ingresados e inténtalo de nuevo.';
  }
  if (error.status === 409) {
    return 'No pudimos completar la acción porque ya existe un registro con esos datos.';
  }

  return error.problem.detail || 'No pudimos completar la solicitud. Inténtalo de nuevo.';
}

export function diagnosticoErrorApi(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Error inesperado.';
  if (error.status === 0) {
    return `Error de red: ${error.problem.detail ?? error.message}\nURL: ${error.requestUrl ?? 'URL no disponible'}`;
  }

  const code = error.problem.code ? ` · ${error.problem.code}` : '';
  const detail = error.problem.detail ? `\n${error.problem.detail}` : '';
  return `HTTP ${error.status}${code}${detail}`;
}
