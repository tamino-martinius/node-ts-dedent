#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * Extract the body under "## vNext" up to the next "## " heading.
 * Returns null if there is no vNext heading, '' if the body is empty or "TBD",
 * otherwise the trimmed body text.
 */
export function extractVNext(historyText) {
  const lines = historyText.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+vNext\s*$/i.test(l));
  if (start === -1) return null;
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) break;
    body.push(lines[i]);
  }
  const text = body.join('\n').trim();
  if (!text || /^tbd$/i.test(text)) return '';
  return text;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outfile = process.argv[2];
  const historyPath = process.argv[3] || 'HISTORY.md';
  if (!outfile) {
    console.error('usage: release-compose-notes.mjs <outfile> [historyPath]');
    process.exit(2);
  }
  const notes = extractVNext(readFileSync(historyPath, 'utf8'));
  if (notes === null) {
    console.error('::error::no "## vNext" section found in ' + historyPath);
    process.exit(2);
  }
  if (notes === '') {
    process.stderr.write('vNext is empty/TBD — caller should fall back to generated notes\n');
    process.exit(1);
  }
  writeFileSync(outfile, notes + '\n');
  process.stdout.write(`wrote release notes to ${outfile}\n`);
}
