import { registerAs } from '@nestjs/config';

export const securityConfig = registerAs('security', () => ({
  dataEncryptionKey: Buffer.from(process.env.DATA_ENCRYPTION_KEY!, 'base64'),
  bcryptCost: Number(process.env.BCRYPT_COST ?? 12),
}));
