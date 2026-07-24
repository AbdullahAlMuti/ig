/**
 * Materializes the extension PNG icons from assets/icons to src/public/icons/.
 *
 * Supports direct PNG sources (icon16.png, icon32.png, icon48.png, icon128.png)
 * or legacy base64 files (*.b64).
 * Runs automatically on postinstall and prebuild.
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'src/public/icons');
const srcDir = resolve(root, 'assets/icons');

const ICON_MAPPINGS = [
  { size: '16', srcName: 'icon16.png', b64Name: '16.png.b64', outName: '16.png' },
  { size: '32', srcName: 'icon32.png', b64Name: '32.png.b64', outName: '32.png' },
  { size: '48', srcName: 'icon48.png', b64Name: '48.png.b64', outName: '48.png' },
  { size: '128', srcName: 'icon128.png', b64Name: '128.png.b64', outName: '128.png' },
];

mkdirSync(outDir, { recursive: true });

for (const { size, srcName, b64Name, outName } of ICON_MAPPINGS) {
  const directPng = resolve(srcDir, srcName);
  const directSizePng = resolve(srcDir, `${size}.png`);
  const b64Path = resolve(srcDir, b64Name);
  const outPath = resolve(outDir, outName);

  if (existsSync(directPng)) {
    copyFileSync(directPng, outPath);
    console.log(`[prepare-icons] copied ${srcName} -> ${outName}`);
  } else if (existsSync(directSizePng)) {
    copyFileSync(directSizePng, outPath);
    console.log(`[prepare-icons] copied ${size}.png -> ${outName}`);
  } else if (existsSync(b64Path)) {
    const base64 = readFileSync(b64Path, 'utf8').trim();
    writeFileSync(outPath, Buffer.from(base64, 'base64'));
    console.log(`[prepare-icons] decoded ${b64Name} -> ${outName}`);
  } else {
    console.warn(`[prepare-icons] missing source for size ${size} in ${srcDir}`);
  }
}
