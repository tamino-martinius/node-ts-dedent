import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { writeBuildMarkers } from '../write-build-markers.mjs';

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
