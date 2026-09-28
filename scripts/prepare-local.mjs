import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import './sites-env.mjs';
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || major === 22 && minor < 13) throw Error('Se requiere Node >=22.13.0');
const cli = 'node_modules/wrangler/bin/wrangler.js';
if (!existsSync(cli)) throw Error('Primero ejecutar npm run install:ci');
const file = '.dev.vars';
const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
if (!/^\s*CREDENTIALS_ENCRYPTION_KEY\s*=/m.test(current)) {
  appendFileSync(file, '\nCREDENTIALS_ENCRYPTION_KEY="' + randomBytes(32).toString('base64') + '"\n', { mode: 0o600 });
  console.log('Clave local creada en .dev.vars (no compartir).');
}
const result = spawnSync(process.execPath, [cli, 'd1', 'migrations', 'apply', 'DB', '--local', '--config', 'wrangler.local.json', '--persist-to', '.wrangler/state'], { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('Entorno local preparado. Ejecutar npm run dev y abrir http://localhost:5173');
