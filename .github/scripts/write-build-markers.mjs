#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Write module-type markers so Node treats dist/ as CommonJS and esm/ as ESM
 * regardless of the root package "type" or Node's ESM syntax detection.
 */
export function writeBuildMarkers(rootDir = process.cwd()) {
  const targets = [
    ['dist', { type: 'commonjs' }],
    ['esm', { type: 'module' }],
  ];
  for (const [dir, body] of targets) {
    mkdirSync(join(rootDir, dir), { recursive: true });
    writeFileSync(join(rootDir, dir, 'package.json'), JSON.stringify(body, null, 2) + '\n');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeBuildMarkers();
}
