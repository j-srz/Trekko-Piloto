import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service.js';

describe('CryptoService', () => {
  let cryptoService: CryptoService;

  beforeEach(() => {
    const config = new ConfigService({
      security: {
        dataEncryptionKey: Buffer.from('0123456789abcdef0123456789abcdef'),
        bcryptCost: 4,
      },
    });
    cryptoService = new CryptoService(config);
  });

  it('hashes and compares passwords without returning the password', async () => {
    const hash = await cryptoService.hashPassword(
      'correct horse battery staple',
    );

    expect(hash).not.toBe('correct horse battery staple');
    expect(
      await cryptoService.comparePassword('correct horse battery staple', hash),
    ).toBe(true);
    expect(
      await cryptoService.comparePassword('incorrect password', hash),
    ).toBe(false);
  });

  it('creates configurable-length random tokens', () => {
    expect(cryptoService.randomToken()).toMatch(/^[a-f0-9]{64}$/);
    expect(cryptoService.randomToken(12)).toMatch(/^[a-f0-9]{24}$/);
    expect(cryptoService.randomToken()).not.toBe(cryptoService.randomToken());
  });

  it('encrypts and decrypts with AES-256-GCM using a fresh IV', () => {
    const first = cryptoService.encrypt('identity document');
    const second = cryptoService.encrypt('identity document');

    expect(cryptoService.decrypt(first)).toBe('identity document');
    expect(first).not.toBe(second);
  });

  it('rejects malformed or tampered encrypted payloads', () => {
    expect(() => cryptoService.decrypt('invalid')).toThrow(
      'Invalid encrypted payload',
    );

    const [iv, tag, ciphertext] = cryptoService.encrypt('secret').split('.');
    const tampered = `${iv}.${tag}.${`${ciphertext}AA`}`;
    expect(() => cryptoService.decrypt(tampered)).toThrow();
  });

  it('computes deterministic keyed HMACs and differentiates the input', () => {
    expect(cryptoService.hmac('payload')).toBe(cryptoService.hmac('payload'));
    expect(cryptoService.hmac('payload')).not.toBe(cryptoService.hmac('other'));
    expect(cryptoService.hmac('payload')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('derives deterministic HKDF keys for the same context and separates contexts', () => {
    const first = cryptoService.deriveKey('salt', 'identity', 32);

    expect(first).toHaveLength(32);
    expect(first.equals(cryptoService.deriveKey('salt', 'identity', 32))).toBe(
      true,
    );
    expect(
      first.equals(cryptoService.deriveKey('salt-2', 'identity', 32)),
    ).toBe(false);
    expect(first.equals(cryptoService.deriveKey('salt', 'other', 32))).toBe(
      false,
    );
  });

  it('rejects invalid HKDF output lengths', () => {
    expect(() => cryptoService.deriveKey('salt', 'info', 0)).toThrow(
      RangeError,
    );
    expect(() => cryptoService.deriveKey('salt', 'info', 65)).toThrow(
      RangeError,
    );
    expect(() => cryptoService.deriveKey('salt', 'info', 1.5)).toThrow(
      RangeError,
    );
  });
});
