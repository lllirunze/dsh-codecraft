# Repository Guidelines

## Project Structure & Module Organization

`src/index.ts` is the DSH host entry point. Host-side filesystem and HTTP logic lives in `src/host/`; shared request and response types live in `src/protocol.ts`. The browser entry point is `src/client/index.tsx`. Client lifecycle and native-tab integration live in `src/client/core/` and `src/client/renderer/`; shared CodeMirror extensions, document state, and language selection live in `src/client/editor/`, `src/client/document/`, and `src/client/languages/`. Tests are flat under `tests/` and generally mirror the module name, such as `tests/files.test.ts`. Build scripts live in `scripts/`, CI workflows in `.github/workflows/`, and generated output in `lib/`. Do not edit `lib/` by hand.

## Build, Test, and Development Commands

Use Node.js 20 or later and install the locked dependency set with `npm ci`.

- `npm run typecheck` checks strict TypeScript types without emitting files.
- `npm test` runs the Vitest suite once.
- `npm run build` bundles host and client entries and emits declarations into `lib/`.
- `npm run verify` validates the generated package artifacts.
- `npm run check` runs all four checks in CI order; run this before opening a pull request.

For a local DSH installation, run `dsh plugin --profile desktop add "$PWD"` after a successful build, then restart DSH Desktop.

## Coding Style & Naming Conventions

Follow the existing TypeScript style: two-space indentation, single quotes, no semicolons, trailing commas in multiline constructs, and ESM imports with `.js` suffixes. Keep strict typing intact; avoid `any` except at deliberately untyped boundaries. Use `camelCase` for functions and variables, `PascalCase` for React components and types, and `UPPER_SNAKE_CASE` for constants. There is no configured formatter or linter, so match nearby code and rely on `npm run typecheck`.

## Testing Guidelines

Write tests with Vitest (`describe`, `it`, `expect`) in `tests/<module>.test.ts`. Cover success paths, validation failures, security boundaries, and regression cases. Use temporary directories for filesystem tests and clean them in `afterEach`. No numeric coverage threshold is configured; meaningful behavioral coverage is expected. Run one file with `npx vitest run tests/files.test.ts`.

## Commit & Pull Request Guidelines

History follows Conventional Commit prefixes such as `feat:`, `fix:`, and `ci:`. Keep commits focused and use an imperative summary. Pull requests should explain the behavior change, link relevant issues, note compatibility or security effects, and include screenshots for editor UI changes. Confirm `npm run check` passes and update README files or `CHANGELOG.md` when user-facing behavior changes.

## Release Guidelines

Follow [`docs/releasing.md`](docs/releasing.md) whenever preparing a version, Git tag, or GitHub Release. Keep the package version, lockfile version, changelog entry, tag, Release title, and Release heading identical. Release notes use the repository's short single-section format; do not add installation, update, test-summary, compatibility, or other boilerplate sections unless the release itself changes those areas.
