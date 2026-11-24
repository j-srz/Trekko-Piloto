import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

@Injectable()
export class CryptoService {
  private readonly encryptionKey: Buffer;
  private readonly bcryptCost: number;

  constructor(config: ConfigService) {
    this.encryptionKey = config.getOrThrow<Buffer>(
      'security.dataEncryptionKey',
    );
    this.bcryptCost = config.get<number>('security.bcryptCost', 12);
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.bcryptCost);
    return bcrypt.hash(password, salt);
  }

  async comparePassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  randomToken(bytes = 32): string {
    return randomBytes(bytes).toString('hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [iv, tag, ciphertext]
      .map((part) => part.toString('base64url'))
      .join('.');
  }

  decrypt(encrypted: string): string {
    const parts = encrypted.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted payload');
    }

    const [iv, tag, ciphertext] = parts.map((part) =>
      Buffer.from(part, 'base64url'),
    );
    if (iv.length !== 12 || tag.length !== 16) {
      throw new Error('Invalid encrypted payload');
    }

    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }

  hmac(value: string): string {
    const key = this.deriveKey('trekko-hmac-v1', 'hmac');
    return createHmac('sha256', key).update(value, 'utf8').digest('hex');
  }

  deriveKey(salt: string, info: string, length = 32): Buffer {
    if (!Number.isInteger(length) || length < 1 || length > 64) {
      throw new RangeError('HKDF output length must be between 1 and 64 bytes');
    }
    return Buffer.from(
      hkdfSync('sha256', this.encryptionKey, salt, info, length),
    );
  }
}
