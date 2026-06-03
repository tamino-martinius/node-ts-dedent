import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { writeBuildMarkers } from '../write-build-markers.mjs';
import { deriveDistTag } from '../release-derive-dist-tag.mjs';

test('writeBuildMarkers writes dist + esm module-type markers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'markers-'));
  try {
    writeBuildMarkers(dir);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'dist/package.json'), 'utf8')), {
      type: 'commonjs',
    });
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'esm/package.json'), 'utf8')), {
      type: 'module',
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('deriveDistTag: stable version → latest', () => {
  assert.equal(deriveDistTag('2.3.0'), 'latest');
  assert.equal(deriveDistTag('10.0.1'), 'latest');
});

test('deriveDistTag: prerelease → leading alpha identifier', () => {
  assert.equal(deriveDistTag('2.3.0-beta.1'), 'beta');
  assert.equal(deriveDistTag('2.3.0-rc.0'), 'rc');
  assert.equal(deriveDistTag('2.3.0-next.5'), 'next');
  assert.equal(deriveDistTag('2.3.0-alpha'), 'alpha');
});

test('deriveDistTag: numeric-only prerelease id → next', () => {
  assert.equal(deriveDistTag('2.3.0-1'), 'next');
});

import { bumpVersion } from '../release-bump-version.mjs';
import { writeFileSync as wf, readFileSync as rf, mkdtempSync as mkd, rmSync as rm } from 'node:fs';
import { tmpdir as td } from 'node:os';
import { join as jn } from 'node:path';

test('bumpVersion sets version and keeps 2-space indent + trailing newline', () => {
  const dir = mkd(jn(td(), 'bump-'));
  try {
    const p = jn(dir, 'package.json');
    wf(p, JSON.stringify({ name: 'x', version: '1.0.0' }, null, 2) + '\n');
    const out = bumpVersion(p, '2.3.0');
    assert.equal(out, '2.3.0');
    const raw = rf(p, 'utf8');
    assert.equal(JSON.parse(raw).version, '2.3.0');
    assert.match(raw, /\n {2}"version": "2.3.0"/);
    assert.ok(raw.endsWith('\n'));
  } finally {
    rm(dir, { recursive: true, force: true });
  }
});
