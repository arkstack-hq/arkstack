# Versioning and Releases

This page is for maintainers. It covers how Arkstack versions its packages and starter templates, and how a release gets from `main` to npm. If you are upgrading an application, read [Upgrading](/guide/upgrading) instead.

## What gets released

One release publishes everything in the monorepo that has a public package:

| Part                     | Location             | Published as                            |
| ------------------------ | -------------------- | --------------------------------------- |
| Framework packages       | `packages/*`         | `@arkstack/*` on npm                    |
| Project generator        | `create-arkstack`    | `create-arkstack` on npm                |
| Starter templates        | `templates/*`        | Not published; downloaded from GitHub   |
| Workspace root and tests | `package.json`, etc. | Private, versioned for bookkeeping only |

`create-arkstack` downloads the templates straight from the `arkstack-hq/arkstack` repository with giget, keeps the chosen `templates/<kit>` folder, and rewrites its `workspace:^` and `catalog:` dependencies to real version ranges.

## One version for everything

Arkstack uses a single, lockstep version. Every `@arkstack/*` package, `create-arkstack`, the templates and the workspace root carry the same version number, even when a package has no changes. Applications should therefore keep all `@arkstack/*` dependencies on the same version.

Lockstep keeps upgrades simple: a project is "on Arkstack 0.22.0", not on a mix of package versions that were never tested together.

The template version and the package version are the same number. A project scaffolded by `create-arkstack@0.22.0` depends on `^0.22.0` of every `@arkstack/*` package it uses.

## Choosing the version number

Arkstack follows [semantic versioning](https://semver.org). While it is below 1.0, the rules are:

| Bump                      | When                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Minor (`0.21.x → 0.22.0`) | A new package, driver or template; a new feature that changes what a template contains; any breaking change to a public API, config shape or template file apps are expected to edit. |
| Patch (`0.22.0 → 0.22.1`) | Bug fixes, additive options with safe defaults, dependency bumps, docs.                                                                                                               |
| Major (`1.0.0`)           | Reserved for the first stable release.                                                                                                                                                |

Because applications depend on `^0.x.y`, a caret range never crosses a minor version below 1.0. A minor release is the only place where a breaking change may land, and it must come with an entry in the [upgrade guide](/guide/upgrading).

Prefer deprecating over removing. When an API is renamed, keep the old name working and mark it deprecated in a minor release, as `Hook.set()` was when `Hook.on()` arrived in 0.20.0, then remove it in a later minor release.

## Before releasing

1. Make sure CI on `main` is green. `ci.yml` runs lint and the full test suite against PostgreSQL on Node 22, 24 and 25.
2. Release changes that templates depend on promptly. `create-arkstack` always downloads the templates from the tip of `main`, while the dependencies it writes point at the last published version. A template on `main` that uses a package API that hasn't been published yet produces broken new projects until the next release.
3. Bump the third-party versions in the `catalog` of `pnpm-workspace.yaml` if the release needs newer versions of resora, kanun, arkormx, clear-router or others. Templates and `create-arkstack` read their versions from there.
4. Update `CHANGELOG.md`: rename the `[Unreleased]` section to `[x.y.z] - YYYY-MM-DD` and start a new, empty `[Unreleased]` above it. Keep `docs/more/changelog.md`, the published copy, identical to it.
5. If the release has breaking changes or template changes apps should copy, add a section to [Upgrading](/guide/upgrading).

Do not edit `version` fields by hand. The release workflow sets them.

## Publishing a release

Releases are cut from GitHub:

1. Create a GitHub release on `main` with a tag named after the version, with no `v` prefix (for example `0.22.0`).
2. Publishing the release starts the **Publish to NPM** workflow (`.github/workflows/publish.yml`).

The workflow can also be started by hand from the Actions tab with a `version` input, or by pushing a `v*` tag.

The workflow then:

1. Checks out the release's target branch.
2. Runs `pnpm prepare:release-version <version>`, which sets `version` in the root, `create-arkstack`, every template and every package, and rewrites the `@arkstack/*` ranges and catalog versions in `create-arkstack/src/data.ts`.
3. Builds the templates, the console and `create-arkstack`, then runs lint, migrations and the full test suite.
4. Commits the version changes as `chore: prepare release v<version>` and pushes them to the branch.
5. Runs `pnpm publish:packages`, which publishes every `@arkstack/*` package and `create-arkstack` with public access.

If any check fails, nothing is committed or published. Fix the problem on `main`, then run the workflow again from the Actions tab with the same `version`.

The workflow publishes under npm's default `latest` tag and has no prerelease channel yet. Don't release a prerelease version such as `0.23.0-beta.1` through it, because every user would get it.

## Releasing by hand

`scripts/release-order.mjs` works out the publish order from the workspace dependency graph, so dependencies are published before the packages that use them:

```sh
node scripts/release-order.mjs order     # print the order
node scripts/release-order.mjs publish   # print the publish commands
node scripts/release-order.mjs publish --run
```

Use it only when the workflow cannot run. Outside CI, each package's `prepublishOnly` builds the package first.

## Recovering from a bad release

npm only allows unpublishing for a short time after a release, and never when other packages depend on the version. Point `latest` back at the last good version and deprecate the bad one instead:

```sh
node scripts/release-order.mjs fix --bad 0.22.1 --good 0.22.0          # print the commands
node scripts/release-order.mjs fix --bad 0.22.1 --good 0.22.0 --run
```

Then ship the fix as a new patch release. If unpublishing is still possible, `unpublish --bad <version>` prints the commands in reverse dependency order.

## Related packages

resora, kanun, arkormx and clear-router are released from their own repositories on their own version lines. Arkstack picks up their new versions through the `catalog` in `pnpm-workspace.yaml`, and a catalog bump goes in the next Arkstack release like any other change.
