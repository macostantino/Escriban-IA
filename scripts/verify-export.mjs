import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(root, 'EXPORT-MANIFEST.json'), 'utf8').replace(/^\uFEFF/, ''));
let failed = 0;
for (const entry of manifest.files) {
  try {
    const target = resolve(root, entry.path);
    if (!target.startsWith(resolve(root) + sep)) throw Error('Ruta inválida');
    const data = readFileSync(target);
    if (data.length !== entry.bytes || createHash('sha256').update(data).digest('hex') !== entry.sha256) throw Error('Contenido diferente');
  } catch (error) { console.error(entry.path + ': ' + error.message); failed++; }
}
console.log(`${manifest.files.length} archivos comprobados; ${failed} diferencias.`);
process.exitCode = failed ? 1 : 0;
