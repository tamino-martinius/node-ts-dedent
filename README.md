# TypeScript Dedent

[![codecov](https://codecov.io/gh/tamino-martinius/node-ts-dedent/branch/master/graph/badge.svg)](https://codecov.io/gh/tamino-martinius/node-ts-dedent)

TypeScript package which smartly trims and strips indentation from multi-line strings.

## Usage Examples

```js
import { dedent } from 'ts-dedent';

console.log(dedent`A string that gets so long you need to break it over
                    multiple lines. Luckily dedent is here to keep it
                    readable without lots of spaces ending up in the string
                    itself.`);

console.log(dedent`
  A string that gets so long you need to break it over
  multiple lines. Luckily dedent is here to keep it
  readable without lots of spaces ending up in the string
  itself.
`);
```

```txt
A string that gets so long you need to break it over
multiple lines. Luckily dedent is here to keep it
readable without lots of spaces ending up in the string
itself.
```

---

```js
console.log(dedent`
  Leading and trailing lines will be trimmed, so you can write something like
  this and have it work as you expect:

    * how convenient it is
    * that I can use an indented list
        - and still have it do the right thing

  That's all.
`);
```

```txt
Leading and trailing lines will be trimmed, so you can write something like
this and have it work as you expect:

  * how convenient it is
  * that I can use an indented list
    - and still have it do the right thing

That's all.
```

---

```js
console.log(dedent`
  Also works fine

  ${1}. With any kind of
  ${2}. Placeholders
`);
```

```txt
Also works fine

1. With any kind of
2. Placeholders
```

---

```js
console.log(dedent(`
  Wait! I lied. Dedent can also be used as a function.
`);
```

```txt
Wait! I lied. Dedent can also be used as a function.
```

## Releasing

Releases are automated by the [`Release` workflow](.github/workflows/release.yml): on GitHub go
to **Actions → Release → Run workflow** on `master` and enter the version without a leading `v`
(e.g. `2.3.0`, or `2.3.0-beta.1` for a prerelease). The workflow tests, verifies the packaged
artifact on every maintained Node version across Linux/macOS/Windows, then publishes to npm with
provenance, pushes the release commit + tag, and creates the GitHub release.

Two one-time prerequisites must be configured before the first release:

1. **npm trusted publisher** — on npmjs.com, add a GitHub Actions trusted publisher for the
   `ts-dedent` package (repository `tamino-martinius/node-ts-dedent`, workflow `release.yml`).
   Publishing is tokenless via OIDC `--provenance`; no `NPM_TOKEN` is stored.
2. **Branch protection** — `master` must allow `github-actions[bot]` to push the release commit
   and tag.

Each release derives its notes from the `## vNext` section of [`HISTORY.md`](HISTORY.md), so put
the changelog entries there (replacing `TBD`) before running the workflow.

## License

MIT

## Based on

- [dedent](https://www.npmjs.com/package/dedent) by ~dmnd
- [dedent-js](https://www.npmjs.com/package/dedent-js) by ~martin-kolarik

## Changelog

See [history](HISTORY.md) for more details.

- `2.2.1` **2021-08-01** Update build dependencies and fixed typos in readme
- `2.2.0` **2021-08-01** Add indentation to values with multiline strings & added ESM module
- `2.1.1` **2021-03-31** Update build dependencies
- `2.1.0` **2021-03-24** Bugfixes
- `2.0.0` **2020-09-28** Bugfixes
- `1.2.0` **2020-09-28** Update build dependencies and a couple of minor improvments
- `1.1.0` **2019-07-26** Update build dependencies and fixed links in readme
- `1.0.0` **2018-06-14** Initial release
