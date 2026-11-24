import { CommonModule } from './common.module.js';
import { HealthModule } from '../health/health.module.js';
import { StorageModule } from '../storage/storage.module.js';

describe('shared Nest modules', () => {
  it('exports the clock/crypto, health, and storage modules', () => {
    expect(CommonModule).toBeDefined();
    expect(HealthModule).toBeDefined();
    expect(StorageModule).toBeDefined();
  });
});
