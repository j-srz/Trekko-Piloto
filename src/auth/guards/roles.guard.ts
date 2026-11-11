import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth.constants.js';
import type { AppRole } from '../decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>().user;
    return Boolean(user && required.some((role) => user.roles.includes(role)));
  }
}
