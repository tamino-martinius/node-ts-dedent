#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

const tgzArg = process.argv[2];
if (!tgzArg) {
  console.error('usage: verify-packaged.mjs <path-to-.tgz>');
  process.exit(2);
}
const tgz = resolve(process.cwd(), tgzArg);

const node = process.execPath;

const results = [];
function step(name, fn) {
  process.stdout.write(`\n=== ${name} ===\n`);
  try {
    fn();
    results.push([name, true]);
  } catch (err) {
    console.error(String(err && err.message ? err.message : err));
    results.push([name, false]);
  }
}
function run(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', ...opts });
}
// npm is `npm.cmd` on Windows, and Node refuses to execFile `.cmd`/`.bat` files directly
// (CVE-2024-27980). Spawn cmd.exe with an argument ARRAY (no shell string is constructed,
// so there is no injection surface); on POSIX run npm directly.
function npmInstall(args, cwd) {
  if (process.platform === 'win32') {
    run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm', ...args], { cwd });
  } else {
    run('npm', args, { cwd });
  }
}

const tmp = mkdtempSync(join(tmpdir(), 'tsdedent-verify-'));
try {
  writeFileSync(
    join(tmp, 'package.json'),
    JSON.stringify({ name: 'ts-dedent-consumer', private: true, version: '0.0.0' }, null, 2) + '\n',
  );

  // typescript@latest is intentional: verify the published types resolve against the CURRENT
  // TypeScript. This is what surfaces resolution regressions (e.g. TS6 tightened nodenext).
  step('install packed tarball + typescript', () => {
    npmInstall(['install', tgz, 'typescript@latest', '--no-audit', '--no-fund', '--silent'], tmp);
  });

  // 1) Runtime smoke — every import style.
  step('copy smoke consumers into consumer project', () => {
    copyFileSync(join(here, 'smoke', 'consumer.cjs'), join(tmp, 'consumer.cjs'));
    copyFileSync(join(here, 'smoke', 'consumer.mjs'), join(tmp, 'consumer.mjs'));
  });
  step('runtime: CommonJS require()', () => run(node, ['--test', 'consumer.cjs'], { cwd: tmp }));
  step('runtime: ESM import', () => run(node, ['--test', 'consumer.mjs'], { cwd: tmp }));

  // 2) Type resolution — CJS + ESM consumers across resolution modes.
  const tscBin = join(tmp, 'node_modules', 'typescript', 'bin', 'tsc');
  const useNamed = "import { dedent } from 'ts-dedent';\nexport const a: string = dedent('x');\nexport const b: string = dedent`x`;\n";
  const useDefault = "import dedent from 'ts-dedent';\nexport const a: string = dedent('x');\nexport const b: string = dedent`x`;\n";

  function typeCase(dir, pkgType, modes) {
    const d = join(tmp, dir);
    mkdirSync(d, { recursive: true });
    if (pkgType) writeFileSync(join(d, 'package.json'), JSON.stringify({ type: pkgType }) + '\n');
    writeFileSync(join(d, 'use_named.ts'), useNamed);
    writeFileSync(join(d, 'use_default.ts'), useDefault);
    for (const m of modes) {
      step(`types: ${dir} (module=${m.module}, moduleResolution=${m.moduleResolution})`, () => {
        const extraFlags = m.ignoreDeprecations
          ? ['--ignoreDeprecations', m.ignoreDeprecations]
          : [];
        run(
          node,
          [
            tscBin, '--noEmit', '--strict', '--skipLibCheck', '--target', 'es2019',
            '--module', m.module, '--moduleResolution', m.moduleResolution,
            ...extraFlags,
            join(d, 'use_named.ts'), join(d, 'use_default.ts'),
          ],
          { cwd: tmp },
        );
      });
    }
  }

  typeCase('types-cjs', 'commonjs', [
    // classic node10 resolution validates the legacy top-level `types`/`main` path (it ignores
    // `exports`). TS6 made node10 a hard error, so suppress that one deprecation.
    { module: 'commonjs', moduleResolution: 'node', ignoreDeprecations: '6.0' },
    { module: 'node16', moduleResolution: 'node16' },
  ]);
  typeCase('types-esm', 'module', [
    { module: 'nodenext', moduleResolution: 'nodenext' },
    { module: 'esnext', moduleResolution: 'bundler' },
  ]);

  // 3) Full existing jest suite against the installed build.
  step('jest suite against packaged build', () => {
    const installed = join(tmp, 'node_modules', 'ts-dedent').replace(/\\/g, '/');
    const cfg = join(tmp, 'jest.packaged.cjs');
    writeFileSync(
      cfg,
      `const path = require('node:path');
module.exports = {
  rootDir: ${JSON.stringify(repoRoot)},
  roots: [path.join(${JSON.stringify(repoRoot)}, 'src')],
  testEnvironment: 'node',
  testRegex: '\\\\.(test|spec)\\\\.ts$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\\\.ts$': ['ts-jest', { isolatedModules: true, tsconfig: { esModuleInterop: true, target: 'es2019', lib: ['es2019', 'dom'] } }],
  },
  moduleNameMapper: { '^ts-dedent$': ${JSON.stringify(installed)} },
};
`,
    );
    const jestBin = join(repoRoot, 'node_modules', 'jest', 'bin', 'jest.js');
    run(node, [jestBin, '--config', cfg], { cwd: repoRoot });
  });
} finally {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}

process.stdout.write('\n=== verify-packaged summary ===\n');
for (const [name, ok] of results) process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${name}\n`);
const failed = results.filter(([, ok]) => !ok);
if (failed.length) {
  process.stderr.write(`\n${failed.length} packaged check(s) failed\n`);
  process.exit(1);
}
process.stdout.write('\nAll packaged checks passed.\n');
