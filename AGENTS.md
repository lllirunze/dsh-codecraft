# Repository Guidelines

## Skill-Orchestrated Development

Versioned feature work in this repository is delivered through `feature-development`; independently reported defects in existing behavior are handled through `bug-fixing`. Treat this section as the entry-point tutorial and each `.agents/skills/<name>/SKILL.md` as the authoritative detailed instruction when they differ.

Load a skill with the `skill` tool using its exact name before acting on a matching request, then read every reference file named by that `SKILL.md`. Do not work from this summary alone, and do not follow a skill's instructions until it has been loaded.

### Skill map

| Skill | Load when | Owns | Must not do |
| --- | --- | --- | --- |
| `feature-development` | The user asks to build, implement, complete, or resume a planned version, new feature, or explicit functional enhancement | End-to-end feature orchestration: scope, architecture plan, implementation, focused tests, regression handoff, manual checklist, delivery report | Diagnose an independently reported existing-behavior defect by default; publish, bump release metadata, or write changelog entries |
| `bug-fixing` | An existing feature is incorrect, broken, crashing, failing to load, unresponsive, regressed, or platform-specific, including black-box user reports | Failure modeling, evidence gathering, minimal reproduction, root-cause confirmation, smallest safe correction, focused verification, and regression handoff | Invent new product scope, assume a code change is required, claim unverified success, bump versions, commit, tag, or publish |
| `version-documentation` | Requirements must move from `docs/planning/` into normalized `design.md` and `validation.md`, or a version number must be chosen | Version choice, requirement analysis, normalized English design and validation records, documentation index | Implement code, update package versions, commit, push, tag, or publish |
| `language-module-architecture` | The work concerns a programming language, framework, or developer ecosystem | Placement, Client/Host responsibility split, registration, protocol, lifecycle, capability isolation | Change generic editor or release behavior unrelated to a language module |
| `regression-testing` | The user asks to test, retest, verify, or audit current behavior | Impact-based automated verification, exact command evidence, local Desktop candidate safety gate, DSH Desktop manual checklist | Implement fixes, edit tests to force a pass, install dependencies, mutate the Desktop profile without explicit authorization, or publish |
| `release-management` | The user explicitly asks to publish a validated version after checks and manual acceptance pass | Release metadata sync, release commit, push `master`, annotated tag, push tag, and manual GitHub Release handoff content | Design requirements, plan validation, create or publish the GitHub Release, publish npm, or publish without explicit Git authority |

Detailed references: [version delivery gates](.agents/skills/feature-development/references/version-delivery-gates.md), [version numbering example](.agents/skills/version-documentation/references/version-number-example.md), [current language architecture](.agents/skills/language-module-architecture/references/current-architecture.md), [project regression test map](.agents/skills/regression-testing/references/project-test-map.md), [local DSH Desktop safety validation](.agents/skills/regression-testing/references/dsh-desktop-safety-validation.md), and [release content example](.agents/skills/release-management/references/release-content-example.md).

### Skill routing

- Choose by the user's intended outcome, not by whether code may change. New capabilities use `feature-development`; failures in existing behavior use `bug-fixing`.
- Use `regression-testing` as a standalone workflow for test-only requests and as the verification handoff after feature or bug implementation stabilizes.
- Use `release-management` only after explicit release authority. Ordinary bug repair must not automatically change versions, commit, push, or tag. The Agent never creates or publishes the GitHub Release or publishes npm; it supplies the exact Release content for the user's manual GitHub step.
- Respect diagnosis-only requests: investigate and report without modifying code.
- A failing test discovered while completing an active new feature may remain owned by `feature-development`; a separately reported regression in established behavior is owned by `bug-fixing`.

### End-to-end workflow

For a complete planned version, proceed through these gates and stop at G5 until the user reports manual results:

| Gate | Required evidence | Owner or applied skill | Exit condition |
| --- | --- | --- | --- |
| G0 Scope | Target version, requested outcome, platforms, explicit exclusions | `feature-development` | Scope is clear enough to proceed without changing product intent |
| G1 Requirements | Normalized English `design.md`, requirement IDs, observable behavior, failure cases, and a planned `validation.md` | `version-documentation` | Every mandatory item is testable and later-version work is excluded |
| G2 Architecture | Current-code investigation, requirement-to-file plan, Client/Host ownership, settings/protocol/lifecycle impacts, and test mapping | `feature-development`; `language-module-architecture` when applicable | The smallest feasible design uses real repository extension points |
| G3 Implementation | Source changes, focused tests, and exact focused command results | `feature-development` | In-scope behavior exists and focused checks pass, or blockers are explicit |
| G4 Regression | Impact scope, exact commands, `PASS`/`FAIL`/`INCOMPLETE`, packed-artifact identity when packaging is in scope, and unverified areas | `regression-testing` | Required automation and package inspection pass on the current code revision |
| G4b Local Desktop candidate | Candidate SHA and version, DSH version and profile, explicit authorization, Plugin Manager receipt, exact link or npm source, required restart, Host row/Config/`packageDir`, Client registrations, route fence, and no fresh candidate crash | `regression-testing` with `feature-development`; profile mutation requires explicit user authorization | Candidate is live from the expected source with no activation failure, or the gate is explicitly `BLOCKED`/`NOT VERIFIED` |
| G5 Native acceptance | DSH Desktop startup, open/edit/save, settings, normal exit and restart smoke, plus user-observed results for the change-specific matrix per required platform | User, with an agent-provided checklist | Required manual cases pass; untested cases remain visibly unverified |
| G6 Release handoff | Complete evidence, no critical blocker, and an explicit release request | `release-management` | Version metadata, commit, push, and tag follow the authorized workflow; the user receives the exact title and body for manual GitHub Release publication |

A small isolated feature enhancement may compress this into a short scope, plan, and test loop instead of creating version documents, but it must still follow the same evidence and release boundaries. Ordinary existing-behavior defects follow `bug-fixing` rather than these version-delivery gates.

### Step-by-step procedure

1. **Classify the request.** Decide whether the user asked for design only, implementation of a version or feature, diagnosis/repair of existing behavior, a test-only audit, a resume after manual testing, or publication. Route independent existing-behavior defects to `bug-fixing`; do not infer publication authority from passing tests.
2. **Establish the source of truth.** Read `AGENTS.md`, `package.json`, `git status`, and the target planning or version records. Preserve all unrelated staged, unstaged, and untracked work; never reset, clean, stash, or revert it. Prefer normalized records under `docs/version/vX.Y.Z/`; otherwise apply `version-documentation` before implementation.
3. **Normalize requirements when needed.** Use `version-documentation` to turn the authoritative `docs/planning/` source into `docs/version/vX.Y.Z/design.md` and `validation.md`, preserve requirement IDs, and update `docs/README.md`. Keep `docs/planning/` as raw input, write documents in English, and leave every new checklist item unchecked.
4. **Decide architecture before editing.** For any language, framework, or ecosystem feature, load `language-module-architecture` and read `docs/guide/intelligence-module-conventions.md` plus the current source. Produce a short placement plan showing each capability, its category, runtime (Client, Host, or shared boundary), concrete path, reused contract, and reason. Reuse existing extension points instead of creating parallel registries, routes, editors, save paths, or empty future modules.
5. **Write a traceable plan.** Map every in-scope requirement ID to observable behavior and negative cases, owning modules and files, focused tests, and native Desktop scenarios. Flag only decisions that materially change scope, security, compatibility, or product behavior.
6. **Implement the agreed scope.** Follow repository TypeScript style and public contracts, keep browser code free of Node APIs and Host code free of React, CodeMirror, and DOM objects, preserve ordinary editing and saving when optional assistance is disabled or fails, and add defensive handling for malformed input, stale async work, and teardown. Add or update flat Vitest files under `tests/`. Do not edit generated `lib/` by hand, weaken assertions, expand the version silently, or update release metadata.
7. **Verify, fix, and reverify.** Run the smallest relevant Vitest files first, then the broader checks justified by the change. `feature-development` owns defects introduced or exposed within its active feature scope; independently reported defects use `bug-fixing`. After any fix, rerun the affected focused checks and every broader result invalidated by that code change.
8. **Run regression testing.** Load `regression-testing` when implementation stabilizes or the user asks for testing. Use its impact map to select focused files; for a completed feature or cross-module, settings, lifecycle, Host/protocol, file-safety, or packaging change, run the full gate. For a release candidate or packaging/integration change, also inspect `npm pack --dry-run --ignore-scripts --json` and apply the local Desktop safety gate. Report exact commands, test counts, artifact identity, and `PASS`/`FAIL`/`BLOCKED` evidence.
9. **Validate the local Desktop candidate.** Apply [local DSH Desktop safety validation](.agents/skills/regression-testing/references/dsh-desktop-safety-validation.md) with explicit authorization for profile mutation. Verify the expected source and version, Plugin Manager receipt, required restart, Host row/Config/`packageDir`, Client registrations, and route fence; treat duplicate registration, wrong source, activation failure, or a fresh crash as blocking. If mutation is not authorized, record the gate as `BLOCKED` or `NOT VERIFIED`.
10. **Hand off manual acceptance.** State explicitly that automated implementation and regression are complete and native DSH Desktop testing is required. Provide a checklist derived from `docs/version/vX.Y.Z/validation.md` and the changed behavior, covering editing and saving, new positive and negative cases, settings persistence, language isolation, paths with spaces and Chinese characters, offline behavior, and independent macOS and Windows checks when in scope. Leave items unchecked until the user reports observed results.
11. **Report delivery.** State the target version, delivered scope and exclusions, requirement coverage, architecture and files changed, commands and results, validation document status, manual checks still required or user-confirmed outcomes, and remaining blockers or next actions.
12. **Release only on explicit request.** After `npm run check` and required manual acceptance pass, load `release-management` and follow `docs/guide/releasing.md`. Repository publication requires a separate, explicit instruction to commit, push, and tag. The Agent then supplies the exact GitHub Release title and body; the user selects the tag and clicks Publish Release manually, which triggers the configured npm workflow.

### Choosing the right skill

| User request | Action |
| --- | --- |
| “Design,” “plan,” or “document” the next version | Load `version-documentation`; modify only documentation and the documentation index |
| “Implement,” “build,” or “complete” the planned version, or “add CSS language support” | Load `feature-development`; add `version-documentation` if normalized records are missing and `language-module-architecture` for language work |
| “Cmd+Click navigation stopped responding,” “the plugin crashes,” or another black-box symptom needs diagnosis or repair | Load `bug-fixing`; establish evidence and root cause before the smallest safe correction |
| “The feature works on macOS but fails on Windows” | Load `bug-fixing`; separate platform evidence and do not claim the unavailable platform passed |
| “Only analyze this bug; do not change code” | Load `bug-fixing` in diagnosis-only mode |
| “Only run the Python navigation regression tests; do not change code” | Load `regression-testing`; do not fix code or edit tests |
| “The test I just added while building this new feature fails; continue the feature” | Keep `feature-development` primary and diagnose within the active feature scope |
| “I tested it” or “resume after manual testing” | Resume the owning `feature-development` or `bug-fixing` workflow; record only reported results and rerun automation invalidated by later code changes |
| “Release vX.Y.Z to npm and GitHub,” “publish,” “tag,” or “push” | Load `release-management` only when the request is explicit and all required evidence exists; complete the Git workflow and hand off GitHub Release content for manual publication |
| Architecture, module placement, or capability-boundary question | Load `language-module-architecture`; read the checked-out source before proposing paths |

### Evidence rules

- Use only these states: `PASS` (the check actually ran or behavior was observed and succeeded), `FAIL`, `BLOCKED` (a concrete dependency, environment, permission, or decision prevents execution), `NOT VERIFIED` (required manual or external scenario not observed), and `NOT APPLICABLE` (outside approved scope, with a reason).
- A multi-check conclusion may be `INCOMPLETE` when some required checks are `BLOCKED` or `NOT VERIFIED`; each individual item still uses one of the five states above.
- A command that was not run, is still running, or ran before the latest relevant code change is not a pass. Preserve the exact command, exit result, and key evidence.
- Automated tests do not prove native DSH Desktop behavior, settings persistence across a restart, OS integration, or platform compatibility. Runtime registration inspection proves loading, not visible interaction.
- Requirement changes invalidate affected architecture, implementation, and test assumptions; production or test-code changes after regression invalidate relevant automated results; behavior changes after manual acceptance invalidate relevant manual results.
- Package metadata, entry point, build, manifest, patch, dependency, or supported DSH-version changes invalidate package identity, local candidate application, and Desktop activation evidence. A version-only release-metadata change may retain earlier behavioral acceptance only when no behavior or runtime contract changed; refresh the check, packed-artifact identity, installed version, and startup/open smoke.
- Fix the earliest affected layer, then rerun dependent evidence.
- Never present a design as implemented, automation as native acceptance, or release readiness as publication.

### Standard commands

Read `package.json` before relying on these scripts because they may evolve.

```bash
npx vitest run tests/<module>.test.ts   # focused local check during implementation
npm run typecheck                       # strict TypeScript contracts
npm test                               # full Vitest suite
npm run build                          # bundle host and client entries into lib/
npm run verify                         # validate generated package artifacts
npm run check                          # canonical combined gate in CI order
npm pack --dry-run --ignore-scripts --json  # inspect the package npm would publish
```

`npm run check` runs typecheck, the full test suite, build, and artifact verification. It is the standard G4 evidence command for a completed version or any cross-module change. `npm pack --dry-run --ignore-scripts --json` verifies package identity and included files without running lifecycle scripts. Neither command establishes real DSH Desktop behavior.

### Cross-skill handoff summary

Keep transitions between skills compact and evidence-based:

```text
Version / baseline:
In-scope requirement IDs:
Changed modules and files:
Architecture decisions:
Automated commands and results:
Desktop candidate / DSH version / install source:
Manual status by platform:
Known risks or blockers:
Current gate:
Next action and owner:
```

## Project Structure & Module Organization

`src/index.ts` is the DSH host entry point. Host-side filesystem and HTTP logic lives in `src/host/`; shared request and response types live in `src/protocol.ts`. The browser entry point is `src/client/index.tsx`. Client lifecycle and native-tab integration live in `src/client/core/` and `src/client/renderer/`; shared CodeMirror extensions, document state, and language selection live in `src/client/editor/`, `src/client/document/`, and `src/client/languages/`. Tests are flat under `tests/` and generally mirror the module name, such as `tests/files.test.ts`. Build scripts live in `scripts/`, CI workflows in `.github/workflows/`, and generated output in `lib/`. Do not edit `lib/` by hand.

## Build, Test, and Development Commands

Use Node.js 20 or later and install the locked dependency set with `npm ci`.

- `npm run typecheck` checks strict TypeScript types without emitting files.
- `npm test` runs the Vitest suite once.
- `npm run build` bundles host and client entries and emits declarations into `lib/`.
- `npm run verify` validates the generated package artifacts.
- `npm run check` runs all four checks in CI order; run this before opening a pull request.

For a local DSH installation, after a successful build and `npm run check`, install the repository with explicit authorization through DSH Plugin Manager using the absolute path, or the version-verified CLI form `dsh plugin --profile desktop add "$PWD"`. Do not combine it with an npm installation or hand-edit the profile. Replacing loaded Host or Client code requires a full DSH Desktop restart. Follow [local DSH Desktop safety validation](.agents/skills/regression-testing/references/dsh-desktop-safety-validation.md) for source, version, runtime registration, route, and crash checks.

## Coding Style & Naming Conventions

Follow the existing TypeScript style: two-space indentation, single quotes, no semicolons, trailing commas in multiline constructs, and ESM imports with `.js` suffixes. Keep strict typing intact; avoid `any` except at deliberately untyped boundaries. Use `camelCase` for functions and variables, `PascalCase` for React components and types, and `UPPER_SNAKE_CASE` for constants. There is no configured formatter or linter, so match nearby code and rely on `npm run typecheck`.

## Testing Guidelines

Write tests with Vitest (`describe`, `it`, `expect`) in `tests/<module>.test.ts`. Cover success paths, validation failures, security boundaries, and regression cases. Use temporary directories for filesystem tests and clean them in `afterEach`. No numeric coverage threshold is configured; meaningful behavioral coverage is expected. Run one file with `npx vitest run tests/files.test.ts`.

## Commit & Pull Request Guidelines

History follows Conventional Commit prefixes such as `feat:`, `fix:`, and `ci:`. Keep commits focused and use an imperative summary. Pull requests should explain the behavior change, link relevant issues, note compatibility or security effects, and include screenshots for editor UI changes. Confirm `npm run check` passes and update README files or `CHANGELOG.md` when user-facing behavior changes.

## Release Guidelines

Follow [`docs/guide/releasing.md`](docs/guide/releasing.md) whenever preparing a version, Git tag, or GitHub Release handoff. Keep the package version, lockfile version, changelog entry, tag, Release title, and Release heading identical. A release also requires a current [local DSH Desktop safety validation](.agents/skills/regression-testing/references/dsh-desktop-safety-validation.md) record for the release commit. Release notes use the repository's short single-section format; do not add installation, update, test-summary, compatibility, or other boilerplate sections unless the release itself changes those areas. The user, not the Agent, performs the final GitHub Release publication and thereby triggers npm publication.
