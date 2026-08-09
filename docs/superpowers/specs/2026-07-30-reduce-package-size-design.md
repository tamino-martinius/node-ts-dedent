# Reduce published package size

Design for [issue #51](https://github.com/tamino-martinius/node-ts-dedent/issues/51).

## Problem

The published tarball ships source maps, TypeScript sources, and the test suite.
Measured with `npm pack --dry-run --json` at v2.3.0: 27,376 bytes unpacked, 6,376 packed.

| File                          | Bytes  | Ships? |
| ----------------------------- | ------ | ------ |
| `src/__tests__/index.spec.ts` | 10,720 | drop   |
| `README.md`                   | 4,414  | keep   |
| `package.json`                | 2,013  | keep   |
| `dist/index.js.map`           | 1,906  | drop   |
| `esm/index.js.map`            | 1,894  | drop   |
| `dist/index.js`               | 1,749  | keep   |
| `src/index.ts`                | 1,662  | drop   |
| `esm/index.js`                | 1,651  | keep   |
| `LICENSE`                     | 1,073  | keep   |
| `dist/index.d.ts`             | 123    | keep   |
| `esm/index.d.ts`              | 123    | keep   |
| `dist/package.json`           | 25     | keep   |
| `esm/package.json`            | 23     | keep   |

The test file alone is 39% of the package. Nothing consumers can reach resolves into `src`:
`main`, `module`, `types`, and both `exports` conditions all point into `dist` or `esm`.

## Goal

Ship only what consumers execute or type-check against, and add a CI guard so the package
cannot silently re-inflate.

Target: 11,117 bytes unpacked, a 59% reduction.

(The first draft of this spec predicted 11,194 by subtracting the dropped files from the
current total. The measured result is 77 bytes smaller, because two of the *kept* files also
shrink: removing the 33-byte `//# sourceMappingURL=index.js.map` comment from each of
`dist/index.js` and `esm/index.js`, and dropping the `"src"` entry from `package.json`.)

## Design

### Published file set

Change `package.json`:

```diff
   "files": [
     "dist",
-    "esm",
-    "src"
+    "esm"
   ],
```

npm always includes `package.json`, `README.md`, and `LICENSE` regardless of `files`, so
those are unaffected.

### Source maps

Source maps and `src` are one decision, not two: the `.map` files reference `../src/index.ts`,
so they are dead weight the moment `src` stops shipping.

Excluding the maps from `files` while still generating them is the wrong fix — the emitted
`dist/index.js` would still end with `//# sourceMappingURL=index.js.map` pointing at a file
that is not in the package, which makes bundlers and browser devtools emit "source map not
found" warnings.

Instead, remove `"sourceMap": true` from `tsconfig.json`. Both `compile` invocations
(`tsc --module commonjs --outdir dist` and `tsc --module es6 --outdir esm`) inherit it, so
neither emits `.map` files nor the trailing comment.

Two follow-on edits are required because build output is committed to this repo:

- `git rm dist/index.js.map esm/index.js.map` — both are tracked.
- Recompile and commit `dist/index.js` and `esm/index.js`; their current committed contents
  end with a `sourceMappingURL` comment that must go.

### CI guard

`.github/scripts/verify-packaged.mjs` already exercises the real tarball (CommonJS `require`,
ESM `import`, type resolution across four module/resolution modes, and the full jest suite)
on Linux, macOS, and Windows across Node 22/24/26. Nothing there asserts *which files* are
in the package, so a stray `files` edit or a re-enabled `sourceMap` would go unnoticed.

Add a `step()` immediately after the `install packed tarball + typescript` step, so it runs
before the smoke tests. It recursively walks the installed `node_modules/ts-dedent` tree with
`node:fs` and fails if any path matches a forbidden pattern:

- `*.map`
- any path segment `src`
- any path segment `__tests__`
- `*.ts` that is not `*.d.ts`

Two deliberate choices:

- **Forbidden patterns, not an exact manifest.** An exact file list would also catch accidental
  removals, but it turns every legitimate build-output change into a test edit. The patterns
  encode the actual invariant — no sources, no tests, no maps — and the existing runtime and
  type-resolution steps already fail loudly if a *needed* file goes missing.
- **Walk the installed tree, not the tarball.** `tar -tf` behaves differently under GNU tar and
  the bsdtar shipped on Windows runners. Walking the installed directory with `node:fs` is
  fully portable and asserts what consumers actually receive after extraction.

The step reuses the existing `step()` harness, so it appears in the PASS/FAIL summary and
needs no new CI job.

### Release

Minor release. No API, resolution, or runtime behaviour changes for consumers — only files
that were never reachable are removed.

Replace the `TBD` under `## vNext` in `HISTORY.md` with the change description;
`release-roll-history.mjs` promotes that section at release time.

## Out of scope

The issue also proposes going ESM-only with `engines.node >= 22`.

Deferred to a possible future major release. ts-dedent is a leaf utility depended on broadly
across the JavaScript toolchain, and going ESM-only would only drop the `dist/` half of the
dual build — 1,864 bytes of the 11,117 that remain after this cleanup. That is a large
consumer break for a small size win, and it is a decision worth making on its own merits
rather than folding into a packaging fix. The stale `engines.node: ">=6.10"` field is part of
that same future conversation and is left untouched here.

## Unrelated breakage found during implementation

`verify-packaged.mjs` currently fails one step, on this branch and on `master` alike:

```
types: types-cjs (module=commonjs, moduleResolution=node)
error TS5108: Option 'moduleResolution=node10' has been removed. Please remove it from your configuration.
```

The script deliberately installs `typescript@latest` to catch resolution regressions against
current TypeScript. `latest` is now 7.0.2, which *removed* node10 resolution outright rather
than merely deprecating it, so the script's `--ignoreDeprecations 6.0` escape hatch no longer
applies.

This is environment drift, not a regression from this change — confirmed by running the script
against an unmodified `HEAD` worktree and observing the identical failure. It is left untouched
here to keep this diff minimal, but it will keep CI red until addressed separately. Fixing it
means deciding whether ts-dedent still supports classic node10 type resolution at all, which is
the same `engines`/major-version conversation deferred above.

## Verification

- `npm pack --dry-run --json` — confirm the file list and the 11,117-byte unpacked size.
- `npm test` and `npm run coverage` — confirm dropping `sourceMap` from `tsconfig.json` does
  not disturb jest. `tsconfig.jest.json` extends `tsconfig.json`, but ts-jest manages its own
  in-memory source maps, so stack traces and coverage line-mapping are expected to be
  unaffected. This is the one assumption in this design that is verified rather than assumed.
- `npm run compile && npm pack && node .github/scripts/verify-packaged.mjs <tarball>` — confirm
  the packaged build still resolves and runs, and that the new guard passes.
- Confirm the new guard actually fails when it should, by temporarily restoring `src` to
  `files` and re-running it.
