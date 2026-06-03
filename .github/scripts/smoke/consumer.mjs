import test from 'node:test';
import assert from 'node:assert/strict';
import dedent, { dedent as named } from 'ts-dedent';
import * as ns from 'ts-dedent';

test('ESM: default import is a function and dedents', () => {
  assert.equal(typeof dedent, 'function');
  assert.equal(dedent`\n  a\n  b\n`, 'a\nb');
});

test('ESM: named import is a function and dedents', () => {
  assert.equal(typeof named, 'function');
  assert.equal(named`\n  a\n  b\n`, 'a\nb');
});

test('ESM: namespace exposes default and named', () => {
  assert.equal(typeof ns.default, 'function');
  assert.equal(typeof ns.dedent, 'function');
});
