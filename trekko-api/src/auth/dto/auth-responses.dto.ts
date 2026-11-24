import { ApiProperty } from '@nestjs/swagger';
import type { AppRole } from '../decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.js';

const roles = ['explorador', 'creador', 'anfitrion', 'entidad', 'admin'];
const activeModes = ['explorador', 'creador', 'anfitrion'];

export class SessionUserResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '4d0c23db-020c-4f96-9caf-69f79a68e96a',
  })
  id!: string;

  @ApiProperty({ example: 'Ana Viajera' })
  nombre!: string;

  @ApiProperty({ format: 'email', example: 'ana@example.com' })
  correo!: string;

  @ApiProperty({ type: [String], enum: roles, example: ['explorador'] })
  roles!: AppRole[];

  @ApiProperty({ enum: activeModes, example: 'explorador' })
  modoActivo!: AuthenticatedUser['modoActivo'];
}

export class AuthTokensResponseDto {
  @ApiProperty({
    description: 'Bearer access token',
    example: 'eyJhbGciOiJIUzI1NiJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Single-use refresh token',
    example: 'opaque-refresh-token',
  })
  refreshToken!: string;

  @ApiProperty({ type: SessionUserResponseDto })
  user!: SessionUserResponseDto;
}

export class UserProfileResponseDto extends SessionUserResponseDto {
  @ApiProperty({ minimum: 0, example: 4.8 })
  reputacion!: number;

  @ApiProperty({ minimum: 0, example: 120 })
  puntosSaldo!: number;

  @ApiProperty({ example: false })
  perfilVerificado!: boolean;
}
