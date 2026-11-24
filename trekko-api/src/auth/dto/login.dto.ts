import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ format: 'email', maxLength: 254, example: 'ana@example.com' })
  @IsEmail()
  @MaxLength(254)
  correo!: string;

  @ApiProperty({ maxLength: 72, writeOnly: true, example: 'TrekkoPass123' })
  @IsString()
  @MaxLength(72)
  password!: string;
}
