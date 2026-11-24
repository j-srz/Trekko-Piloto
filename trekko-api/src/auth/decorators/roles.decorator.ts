import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../auth.constants.js';

export type AppRole = 'explorador' | 'creador' | 'anfitrion' | 'entidad' | 'admin';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
