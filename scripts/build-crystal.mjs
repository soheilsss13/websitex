import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const output = 'assets/js/crystal-scene.js';

await build({
  entryPoints: ['src/crystal-scene.js'],
  bundle: true,
  minify: true,
  treeShaking: true,
  format: 'esm',
  target: ['es2020'],
  sourcemap: false,
  legalComments: 'none',
  outfile: output,
  logLevel: 'info'
});

// Normalize whitespace from embedded GLSL source while preserving runtime code.
const bundle = await readFile(output, 'utf8');
const normalized = bundle
  .split('\n')
  .map((line) => line.replace(/[ \t]+$/g, '').replace(/^( +)(\t+)/, '$2'))
  .join('\n');
await writeFile(output, normalized);
