# Release workflow for `ts-dedent` — Design

Date: 2026-06-03
Status: Approved (pending spec review)

## 1. Goal

Add a GitHub Actions **release workflow** that, from a single manual dispatch:

1. Verifies the tests pass **on the packaged package** (the exact `.tgz`) across all
   currently-maintained platforms **before** anything is published.
2. Bumps `package.json` to the released version.
3. Maintains `HISTORY.md` (rolls the `## vNext` section into the released version) and
   derives the GitHub Release notes ("changelog") from that same section.
4. Publishes to npm with provenance.
5. Creates the matching git tag and a GitHub Release with the tarball attached.

Secondary goal: **modernise and align the existing CI workflow** so it tests the package
*as-is* and also **builds + packs + verifies the packaged artifact**, and so both workflows
only run on currently-maintained (non-EOL) Node and OS versions.

This mirrors the structure of the author's `node-next-model` release workflow
(`workflow_dispatch` + `.github/scripts/release-*.mjs` helpers + OIDC `--provenance`),
adapted from a pnpm monorepo to this single npm package.

## 2. Repository facts that shape the design

- Single, unscoped, public npm package `ts-dedent`. Default branch: **`master`**.
- Build: `npm run compile` → `tsc` emits CommonJS to `dist/` and ESM to `esm/`.
- Test: `npm test` → `pretest` runs `eslint .`, then `jest` (ts-jest) against **source**.
- The existing spec `src/__tests__/index.spec.ts` imports `from '..'`, i.e. it tests the
  TypeScript source, **not** the packaged build.
- `src/index.ts` exports **both** `export function dedent` (named) and `export default dedent`.
- `package.json#exports` maps `import` → `esm/index.js`, `require` → `dist/index.js`.
- `.npmignore` is `*` + `!dist` — it **excludes `esm/`**, contradicting the `exports` map.
  This is a real packaging bug; the new ESM smoke test is expected to surface it
  (see §9, "Known issue this design exposes").
- Version drift (pre-existing): `package.json` = `2.2.0`, `HISTORY.md` documents `v2.2.1`,
  git tags stop at `v2.1.1`. Cause: releases were done by hand. The first run of this
  workflow (with an explicit `version` input) reconciles the drift going forward; no
  retroactive history rewrite is performed.

## 3. Shared support matrix (single source of truth)

Used by the CI `test`/`build` jobs and the release `verify` job. EOL dates are written as
comments (`# EOL <active-support-end> / <eol>`) so staleness is easy to spot, matching the
prior CI style. Verified against endoflife.date on 2026-06-03.

```yaml
os: [ubuntu-latest, macos-latest, windows-latest] # *-latest auto-tracks the newest GitHub runner image
node:
  - 22.x # Maintenance LTS — EOL 2025-10-21 / 2027-04-30
  - 24.x # Active LTS      — EOL 2026-10-20 / 2028-04-30
  - 26.x # Current         — EOL 2027-10-27 / 2029-04-30
```

Rationale:
- Node 18/19/20/21/23/25 are all EOL as of 2026-06-03 and are dropped.
- Only Ubuntu 24.04 (`ubuntu-latest`) is in standard support; 22.04/20.04 are ESM-only and
  the `ubuntu-20.04` runner image has already been removed by GitHub. Cross-platform breadth
  is preserved via `macos-latest` + `windows-latest`.
- Pinned OS versions are intentionally avoided in favour of `*-latest` so the OS axis does
  not require manual EOL tracking; only the (manually pinned) Node axis carries EOL comments.

## 4. Release workflow (`.github/workflows/release.yml`)

### 4.1 Trigger & guards (mirrors the reference)

- `on: workflow_dispatch` with a required `version` input: semver, **no leading `v`**
  (e.g. `2.3.0`, `2.3.0-beta.1`).
- `permissions: { contents: write, id-token: write }` (id-token for OIDC provenance).
- `concurrency: { group: release, cancel-in-progress: false }`.
- Guard: refuse unless dispatched from `master`.
- Validate the input is semver; **refuse if tag `v<version>` already exists** on origin.

### 4.2 Architecture — 3-job pipeline (build once → verify everywhere → publish the verified artifact)

The requirement "tests must pass on the packaged package before publish" is only truly
guaranteed if publish is gated on a matrix that exercised the **exact tarball** being
published. Hence three jobs:

**Job `build`** (single, `ubuntu-latest`):
1. Checkout (full history, persisted credentials for later push).
2. Validate version / refuse-if-tag-exists / guard ref.
3. `npm ci`.
4. `npm test` (lint + source jest) — fail fast on obviously broken source.
5. Derive npm dist-tag via `release-derive-dist-tag.mjs`; expose `is_prerelease`.
6. Bump `package.json` version via `release-bump-version.mjs`.
7. `npm install --package-lock-only` to sync `package-lock.json`.
8. Compose release notes from `HISTORY.md` `## vNext` via `release-compose-notes.mjs`
   (records whether real notes were found).
9. Roll `HISTORY.md` via `release-roll-history.mjs` **(stable releases only)**.
10. `npm run compile` then `npm pack` → produce `ts-dedent-<version>.tgz`.
11. Upload artifacts: the `.tgz`, the notes file, and the three mutated files
    (`package.json`, `package-lock.json`, `HISTORY.md`).
- Outputs: `dist_tag`, `is_prerelease`, `have_notes`.

**Job `verify`** (matrix from §3, `needs: build`):
1. Checkout (needed for the spec + smoke scripts + helper).
2. `npm ci` (provides jest/ts-jest/typescript to run the packaged suite).
3. Download the `.tgz` artifact.
4. `node .github/scripts/verify-packaged.mjs <tgz>` — installs the tarball into a throwaway
   consumer project and runs **both**:
   - the **full existing jest suite** against the installed package, and
   - the **CJS + ESM consumer smoke tests**.
   (See §6.) No repo mutation happens here.

**Job `publish`** (single, `ubuntu-latest`, `needs: verify` — runs only if **every** matrix leg passed):
1. Checkout `master`.
2. Download artifacts; restore the three mutated files into the working tree.
3. Configure `github-actions[bot]` git identity.
4. Commit `chore(release): v<version>`; tag `v<version>`; `git push origin master --follow-tags`.
5. `npm install -g npm@latest` (ensure a version new enough for OIDC trusted publishing).
6. `npm publish <tgz> --provenance --access public` via **OIDC trusted publishing**
   (no `NPM_TOKEN`; relies on `id-token: write` + a trusted publisher configured on npmjs.com — see §8).
7. `gh release create v<version> <tgz>` with:
   - `--title v<version>`,
   - `--notes-file <notes>` when real notes exist, otherwise `--generate-notes`,
   - `--prerelease` when `is_prerelease == true`, otherwise `--latest`.

## 5. Helper scripts (`.github/scripts/*.mjs`)

Pure Node ESM, no third-party deps. Mirrors the reference's script-per-concern style so logic
is testable locally (e.g. `node .github/scripts/release-roll-history.mjs 2.3.0`).

- **`release-derive-dist-tag.mjs <version>`** → prints `latest` for a stable version; for a
  prerelease (`X.Y.Z-<id>...`) prints the leading alphabetic identifier (`beta`, `rc`,
  `next`, `alpha`, …), falling back to `next` if the identifier is purely numeric.
- **`release-bump-version.mjs <version>`** → sets `package.json#version`, preserving 2-space
  indentation + trailing newline. Deliberately **not** `npm version`, to avoid triggering the
  existing `preversion` hook (`npm run compile && git add .`) inside CI.
- **`release-compose-notes.mjs <outfile>`** → extracts the body under `## vNext` (up to the
  next `## ` heading) from `HISTORY.md`. Writes it to `<outfile>` and exits `0` when real
  content exists; exits `1` when the section is empty or `TBD` (signal: "no notes, fall back
  to `--generate-notes`"); exits `2` on unexpected error.
- **`release-roll-history.mjs <version>`** → renames the current `## vNext` heading to
  `## v<version>` and inserts a fresh `## vNext` / `TBD` block above it. Refuses if a
  `## v<version>` section already exists. Runs for stable releases only.
- **`verify-packaged.mjs <tgz>`** → shared by CI and release; see §6.

## 6. Packaged verification (`verify-packaged.mjs`) — the core requirement

Given a path to a packed `.tgz`:

1. Create a throwaway temp consumer dir; write a minimal `private` `package.json`.
2. `npm install <abs-path-to-tgz>` into it (installs `ts-dedent` as a real consumer would).
3. **CJS + ESM smoke** — copy `.github/scripts/smoke/consumer.cjs` and `consumer.mjs` into the
   temp dir and execute them there (so `require('ts-dedent')` / `import 'ts-dedent'` resolve to
   the installed tarball). Each uses Node's built-in `node:test` + `node:assert` (zero deps):
   - `consumer.cjs`: `require('ts-dedent')` → exercises `dist` (CJS) + the `require` export.
   - `consumer.mjs`: `import dedent, { dedent as named } from 'ts-dedent'` → exercises `esm`
     (ESM) + the `import` export + the default export.
4. **Full jest suite against the package** — run the repo's jest (from `npm ci`) with a
   generated config:
   - `roots: [<repo>/src]`, `testRegex: \.(test|spec)\.ts$`,
   - ts-jest in **transpile-only** mode (so compile-time module-type resolution of the
     `ts-dedent` import is skipped),
   - `moduleNameMapper: { '^ts-dedent$': '<tempdir>/node_modules/ts-dedent' }` so the spec
     resolves to the **installed tarball** at runtime instead of source.
   This reuses the entire existing 596-line spec to assert real runtime behavior of the
   packaged build. (Type-level validation of the published `.d.ts` is out of scope here; the
   smoke tests + jest validate behavior.)
5. Non-zero exit on any failure; best-effort temp cleanup.

### 6.1 Minimal source change that enables suite reuse

To let the **same** spec test both source (dev/CI) and the packaged artifact (verify),
change one import and add one mapping:

- `src/__tests__/index.spec.ts`: `import { dedent } from '..'` → `import { dedent } from 'ts-dedent'`.
- `package.json` jest config: add `"moduleNameMapper": { "^ts-dedent$": "<rootDir>/src/index.ts" }`
  so the normal dev/CI run still compiles and tests **source**.

This "dogfoods the public package name" and avoids any test duplication or file-copy hacks.

## 7. CI workflow changes (`.github/workflows/ci.yml`)

Align CI with the release testing model and modernise it:

- **`test` job** — intent unchanged: `npm ci` → `npm test` (lint + jest against **source**),
  i.e. "test the package as-is". Matrix updated to §3.
- **`build` job** — now **build → pack → verify-packaged**: `npm ci`, `npm run compile`,
  `npm pack`, then `node .github/scripts/verify-packaged.mjs <tgz>`. This makes every push/PR
  confirm the build/pack process does not break the packaged artifact (full jest suite +
  CJS/ESM smoke). Matrix updated to §3.
- **`coverage` job** — unchanged behavior (`ubuntu-latest`, `lts/*`, `npm run ci`, Codecov upload).
- **Action versions** — bump deprecated pins (`actions/checkout@v3`, `actions/setup-node@v3`,
  `actions/cache@v3`, `codecov/codecov-action@v3`) to their current majors, since `cache@v3`
  is deprecated and these jobs are being edited anyway. The release workflow uses current
  action majors throughout.

## 8. One-time setup the maintainer must do (prerequisites)

- **npm OIDC trusted publishing**: on npmjs.com → `ts-dedent` package → Settings → Trusted
  Publishers → add a GitHub Actions publisher for repo `tamino-martinius/node-ts-dedent`,
  workflow file `release.yml`. This enables tokenless `--provenance` publishing. Without it,
  the publish step fails (by design — no long-lived `NPM_TOKEN` is stored).
- **Branch push permission**: the `publish` job pushes the release commit + tag to `master`
  with the default `GITHUB_TOKEN`. If `master` has branch protection, it must allow the
  GitHub Actions bot to push (or the protection rule must exempt it).

## 9. Edge cases & error handling

- Invalid / `v`-prefixed version input → fail early with a clear `::error::`.
- Tag already exists on origin → refuse before any mutation.
- Empty / `TBD` `vNext` section → release notes fall back to `--generate-notes`; HISTORY roll
  for a stable release still proceeds (renames the empty section), which is acceptable and
  visible in the diff.
- Prerelease versions → non-`latest` dist-tag, `--prerelease` GitHub Release, and HISTORY is
  **not** rolled (kept rolling only on stable releases).
- A failure in **any** `verify` matrix leg blocks `publish` entirely — nothing reaches npm.
- **Known issue this design exposes**: the `.npmignore` (`*` + `!dist`) currently drops `esm/`,
  while `package.json#exports.import` points to `esm/index.js`. The ESM smoke test is expected
  to FAIL until this is fixed. Per the brainstorming decision, this design **surfaces** the bug
  rather than silently fixing it; fixing `.npmignore` (e.g. `!dist` + `!esm`, or removing
  `.npmignore` in favour of the `files` allow-list) is a small follow-up the maintainer can
  approve separately.

## 10. Out of scope

- Retroactively rewriting `HISTORY.md`/tags for the pre-existing `2.2.0`/`2.2.1` drift.
- Fixing the `.npmignore`/`esm` packaging bug (surfaced, not fixed — see §9).
- Automated changelog generation from commits (notes come from `HISTORY.md#vNext`).
- A separate root `CHANGELOG.md` file (HISTORY.md is the single source of truth).

## 11. Deliverables

- `.github/workflows/release.yml` (new).
- `.github/workflows/ci.yml` (modified: matrix, build job, action versions).
- `.github/scripts/release-derive-dist-tag.mjs`
- `.github/scripts/release-bump-version.mjs`
- `.github/scripts/release-compose-notes.mjs`
- `.github/scripts/release-roll-history.mjs`
- `.github/scripts/verify-packaged.mjs`
- `.github/scripts/smoke/consumer.cjs`
- `.github/scripts/smoke/consumer.mjs`
- `src/__tests__/index.spec.ts` (one-line import change).
- `package.json` (jest `moduleNameMapper`).
