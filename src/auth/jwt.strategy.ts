import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppRole } from './decorators/roles.decorator.js';
import type { AuthenticatedUser } from './interfaces/authenticated-user.js';

const appRoles: AppRole[] = [
  'explorador',
  'creador',
  'anfitrion',
  'entidad',
  'admin',
];

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      algorithms: ['HS256'],
    });
  }

  validate(payload: Partial<AuthenticatedUser>): AuthenticatedUser {
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.jti !== 'string' ||
      !Array.isArray(payload.roles) ||
      !payload.roles.every(
        (role): role is AppRole =>
          typeof role === 'string' && appRoles.includes(role as AppRole),
      ) ||
      !['explorador', 'creador', 'anfitrion'].includes(
        String(payload.modoActivo),
      )
    ) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid access token',
      });
    }
    return payload as AuthenticatedUser;
  }
}
