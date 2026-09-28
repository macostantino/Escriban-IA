import { spawnSync } from 'node:child_process';
import './sites-env.mjs';
for (const args of [
  ['node_modules/typescript/bin/tsc', '--noEmit'],
  ['--experimental-strip-types', 'scripts/test-camuzzi.mjs'],
  ['--experimental-strip-types', '--test', 'lib/edersa.test.mjs', 'lib/credential-crypto.test.mjs'],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
