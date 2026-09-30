import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const built = resolve(root, 'dist/index.html');

const targets = [
  '../1 Putt/Web/trackman_range.html',
  '../PiTrac/Sources/PiTrac/Web/trackman_range.html',
  '../../PiTrac/Sources/PiTrac/Web/trackman_range.html',
];

for (const target of targets) {
  const dest = resolve(root, target);
  if (!existsSync(dirname(dest))) continue;
  copyFileSync(built, dest);
  console.log(`copied -> ${dest}`);
}
