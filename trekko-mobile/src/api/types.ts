export interface RegisterRequest {
  nombre: string;
  correo: string;
  password: string;
}

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  nombre: string;
  correo: string;
}
