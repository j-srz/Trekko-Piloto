import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const jestPath = join(root, 'node_modules', 'jest', 'bin', 'jest.js');
const specs = readdirSync(join(root, 'test', 'e2e'))
  .filter((name) => name.endsWith('.e2e-spec.ts'))
  .sort();

if (specs.length === 0) {
  throw new Error('No e2e specs found in test/e2e');
}

for (const spec of specs) {
  const result = spawnSync(
    process.execPath,
    [
      '--experimental-vm-modules',
      jestPath,
      '--config',
      'jest.e2e.config.cjs',
      '--runInBand',
      '--runTestsByPath',
      join('test', 'e2e', spec),
    ],
    { cwd: root, stdio: 'inherit' },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
