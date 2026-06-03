# History

## vNext

- Added an automated release workflow: npm publish with provenance via OIDC trusted publishing, GitHub release creation, and automatic version/HISTORY maintenance
- CI now verifies the packaged tarball (CommonJS `require`, ESM `import`, and TypeScript type resolution) on every maintained Node version (22/24/26) across Linux, macOS, and Windows
- Fixed package `exports` to use per-condition `types` so TypeScript resolves the correct declarations for both ESM (`import`) and CommonJS (`require`) consumers
- Declared the ESM build as `type: module` explicitly and removed the redundant `.npmignore`
- Updated the CI matrix to currently-maintained Node and OS versions (dropped EOL entries)

## v2.2.1

- Fixed typo in readme
- Updated build tools
- Bumped CI test versions

## v2.2.0

Add indentation to values with multiline strings & added ESM module

- Updated all dependencies to their latest version
- Updated CI settings (added node 16, multiple os platforms)
- Moved from Travis CI to Github Actions

## v2.1.1

Security update with dependency changes

- Updated all dependencies to their latest version
- Updated CI settings (added node 15)

## v2.1.0

- Correctly handle escape sequences when used as a tag
- Add test build to CI
- Only run coverage once per change

## v2.0.0

Fixes #4

- ! Might break/change existing behavior
- If a line does not start with whitespace don't remove the indentation

## v1.2.0

Security update with dependency changes

- Updated all dependencies to their latest version
- Updated CI settings
- Replaced tslint with typescript-eslint
- Removed unused @types/node
- Added lint to run with the test suite

## v1.1.0

Security update with dependency changes

- Updated all dependencies to their latest version

## v1.0.0

First release includes following functions

- `function dedent(TemplateStringsArray | string, ...any[]): string
