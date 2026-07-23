/**
 * Materializes the extension PNG icons from their base64 sources.
 *
 * The binary PNGs are stored as text (`assets/icons/*.png.b64`) so the repo
 * stays text-only, and decoded to real PNGs under `src/public/icons/` (which
 * WXT copies into the build). Runs automatically on `postinstall` and
 * `prebuild`; safe to run repeatedly.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'src/public/icons');
const srcDir = resolve(root, 'assets/icons');

const ICONS = ['32.png', '128.png'];

mkdirSync(outDir, { recursive: true });

for (const name of ICONS) {
  const b64Path = resolve(srcDir, `${name}.b64`);
  const outPath = resolve(outDir, name);
  if (!existsSync(b64Path)) {
    console.warn(`[prepare-icons] missing source: ${b64Path}`);
    continue;
  }
  const base64 = readFileSync(b64Path, 'utf8').trim();
  writeFileSync(outPath, Buffer.from(base64, 'base64'));
  console.log(`[prepare-icons] wrote ${outPath}`);
}
