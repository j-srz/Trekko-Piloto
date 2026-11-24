import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ maxLength: 100, example: 'Ana Viajera' })
  @IsString()
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({ format: 'email', maxLength: 254, example: 'ana@example.com' })
  @IsEmail()
  @MaxLength(254)
  correo!: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 72,
    writeOnly: true,
    example: 'TrekkoPass123',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
