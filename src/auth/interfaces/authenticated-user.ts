import type { AppRole } from '../decorators/roles.decorator.js';

export interface AuthenticatedUser {
  sub: string;
  roles: AppRole[];
  modoActivo: 'explorador' | 'creador' | 'anfitrion';
  jti: string;
}
