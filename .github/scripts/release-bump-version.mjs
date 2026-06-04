#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Set package.json#version, preserving 2-space indent + trailing newline. */
export function bumpVersion(pkgPath, version) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  return version;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const version = process.argv[2];
  const pkgPath = process.argv[3] || 'package.json';
  if (!version) {
    console.error('usage: release-bump-version.mjs <version> [packageJsonPath]');
    process.exit(2);
  }
  bumpVersion(pkgPath, version);
  process.stdout.write(`bumped ${pkgPath} → ${version}\n`);
}
