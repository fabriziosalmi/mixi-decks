#!/usr/bin/env node
/**
 * Build all deck plugins as ES modules (.mjs).
 *
 * Each deck directory with a deck.json is compiled to a single
 * index.mjs file that can be loaded by MIXI via dynamic import().
 *
 * React and ReactDOM are externalized (the host app provides them).
 *
 * Usage: node scripts/build-decks.mjs
 * Output: dist/<DeckName>/index.mjs
 */

import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Find all deck directories with deck.json
const deckDirs = fs.readdirSync(ROOT)
  .filter(d => {
    const p = path.join(ROOT, d);
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'deck.json'));
  })
  .sort();

console.log(`Building ${deckDirs.length} decks...\n`);

// Clean dist
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// Copy registry.json to dist
fs.copyFileSync(path.join(ROOT, 'registry.json'), path.join(DIST, 'registry.json'));

let success = 0;
let failed = 0;

for (const dir of deckDirs) {
  const deckPath = path.join(ROOT, dir);
  const manifest = JSON.parse(fs.readFileSync(path.join(deckPath, 'deck.json'), 'utf8'));

  // Find entry point: index.ts or *Deck.tsx
  let entryPoint = path.join(deckPath, 'index.ts');
  if (!fs.existsSync(entryPoint)) {
    const deckFile = fs.readdirSync(deckPath).find(f => f.endsWith('Deck.tsx'));
    if (deckFile) entryPoint = path.join(deckPath, deckFile);
    else {
      console.log(`  [SKIP] ${dir} — no entry point`);
      failed++;
      continue;
    }
  }

  const outDir = path.join(DIST, dir);
  fs.mkdirSync(outDir, { recursive: true });

  try {
    // React is externalized (bare specifiers left in the output).
    // The host app (MIXI v0.4.10+) injects a <script type="importmap">
    // that maps "react" → its bundled React chunk. The browser resolves
    // the bare specifier natively. No window globals needed.
    await build({
      entryPoints: [entryPoint],
      bundle: true,
      format: 'esm',
      outfile: path.join(outDir, 'index.mjs'),
      platform: 'browser',
      target: 'es2022',
      jsx: 'automatic',
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      minify: true,
      sourcemap: false,
      treeShaking: true,
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      logLevel: 'warning',
    });

    // Copy deck.json to dist
    fs.copyFileSync(path.join(deckPath, 'deck.json'), path.join(outDir, 'deck.json'));

    const stat = fs.statSync(path.join(outDir, 'index.mjs'));
    const sizeKB = (stat.size / 1024).toFixed(1);
    console.log(`  [OK] ${dir} → ${sizeKB} KB`);
    success++;
  } catch (err) {
    console.error(`  [FAIL] ${dir}: ${err.message}`);
    failed++;
  }
}

// Update registry.json esmEntry URLs to use relative paths for GitHub Pages
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry.json'), 'utf8'));
const distRegistry = registry.map(m => ({
  ...m,
  esmEntry: `./${m.id.replace('turbo', 'Turbo').replace(/(turbo)(.)/, (_, t, c) => 'Turbo' + c.toUpperCase())}/index.mjs`,
}));

// Actually, keep the full GitHub Pages URLs — they're correct for remote loading
fs.copyFileSync(path.join(ROOT, 'registry.json'), path.join(DIST, 'registry.json'));

console.log(`\nDone: ${success} built, ${failed} failed, output in dist/`);
