import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDirectory = join(root, 'public');
const scriptsDirectory = join(root, 'scripts');
for (const directory of [publicDirectory, scriptsDirectory]) {
  for (const filename of readdirSync(directory)) {
    if (/\.(js|mjs|cjs)$/.test(filename)) {
      execFileSync(process.execPath, ['--check', join(directory, filename)], { stdio: 'inherit' });
    }
  }
}
const html = readFileSync(join(publicDirectory, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
  const reference = match[1];
  if (reference.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(reference)) continue;
  assert(existsSync(join(publicDirectory, reference)), `Missing asset: ${reference}`);
}
assert(existsSync(join(publicDirectory, 'decision-worker.js')));
assert(readFileSync(join(publicDirectory, 'decision-worker.js'), 'utf8').includes("importScripts('decision.js')"));
console.log('JavaScript syntax and local asset references: PASS');
