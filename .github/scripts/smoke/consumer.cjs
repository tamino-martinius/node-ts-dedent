'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const mod = require('ts-dedent');
const { dedent } = require('ts-dedent');

test('CJS: named export is a function and dedents', () => {
  assert.equal(typeof dedent, 'function');
  assert.equal(dedent`\n  a\n  b\n`, 'a\nb');
  assert.equal(dedent('\n  a\n  b\n'), 'a\nb');
});

test('CJS: default export is a function and dedents', () => {
  assert.equal(typeof mod.default, 'function');
  assert.equal(mod.default`\n  a\n  b\n`, 'a\nb');
});

test('CJS: namespace exposes both named and default', () => {
  assert.equal(typeof mod.dedent, 'function');
  assert.equal(typeof mod.default, 'function');
});
