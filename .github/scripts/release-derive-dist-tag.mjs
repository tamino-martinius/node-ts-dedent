#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

/**
 * "latest" for a stable semver; otherwise the leading alphabetic prerelease
 * identifier (beta, rc, next, alpha, ...). Numeric-only prerelease ids → "next".
 */
export function deriveDistTag(version) {
  const dash = version.indexOf('-');
  if (dash === -1) return 'latest';
  const firstId = version.slice(dash + 1).split('.')[0];
  const alpha = firstId.match(/^[A-Za-z]+/);
  return alpha ? alpha[0].toLowerCase() : 'next';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const version = process.argv[2];
  if (!version) {
    console.error('usage: release-derive-dist-tag.mjs <version>');
    process.exit(2);
  }
  process.stdout.write(deriveDistTag(version) + '\n');
}
