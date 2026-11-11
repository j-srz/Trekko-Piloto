import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    minLength: 32,
    writeOnly: true,
    example: 'replace-with-the-refresh-token',
  })
  @IsString()
  @MinLength(32)
  refreshToken!: string;
}
