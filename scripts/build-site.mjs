import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '_site');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const name of ['index.html', 'assets', 'data']) {
  await cp(path.join(root, name), path.join(out, name), { recursive: true });
}
console.log('Built minimal static Pages artifact: index.html + assets/ + data/');
