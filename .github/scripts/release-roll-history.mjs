#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rename the current "## vNext" heading to "## v<version>" and insert a fresh
 * "## vNext" / "TBD" block above it. Throws if v<version> already exists or
 * there is no vNext section.
 */
export function rollHistory(historyText, version) {
  if (new RegExp(`^##\\s+v${escapeRegExp(version)}\\s*$`, 'm').test(historyText)) {
    throw new Error(`HISTORY already contains v${version}`);
  }
  const lines = historyText.split(/\r?\n/);
  const idx = lines.findIndex((l) => /^##\s+vNext\s*$/i.test(l));
  if (idx === -1) throw new Error('no "## vNext" section found');
  lines[idx] = `## v${version}`;
  lines.splice(idx, 0, '## vNext', '', 'TBD', '');
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const version = process.argv[2];
  const historyPath = process.argv[3] || 'HISTORY.md';
  if (!version) {
    console.error('usage: release-roll-history.mjs <version> [historyPath]');
    process.exit(2);
  }
  const rolled = rollHistory(readFileSync(historyPath, 'utf8'), version);
  writeFileSync(historyPath, rolled);
  process.stdout.write(`rolled ${historyPath}: vNext → v${version}\n`);
}
