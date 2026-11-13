# Local DSH Desktop Safety Validation

Use this protocol for every release candidate and for changes that can affect plugin loading, activation, runtime lifecycle, configuration, packaging, or DSH integration. Its purpose is to reduce startup errors, duplicate registrations, stale-code testing, and Desktop crashes. It cannot prove that a native GUI interaction is safe without user-observed acceptance.

## Safety invariants

Treat these values as persistent plugin identities rather than ordinary version metadata:

- package name: `dsh-codecraft`;
- bundle row id: `codecraft` in `cordis.patch.yml`;
- Host plugin name: `dsh-codecraft`;
- Client module and document-preview id: `dsh-codecraft`;
- Host route: `/codecraft/api`;
- package `exports`, `dsh.bundle.patch`, `dsh.client.inject`, and `dsh.client.external` contracts.

A normal version bump must not change these identities. Any requested change to one of them is a compatibility migration: stop, inspect the installed DSH APIs and current profile state, design upgrade and rollback behavior, and obtain explicit scope approval before implementation. Never leave old and new identities active together.

Keep exactly one CodeCraft source selected in the Desktop profile: either one local `link:` bundle or one npm package version. Do not install an npm copy beside a local link, hand-edit the profile package or patch, restore an obsolete profile backup, or overwrite unrelated plugin configuration. Use DSH Plugin Manager for profile mutations.

## Implementation rules that prevent activation errors and crashes

Apply these rules while implementing. Automated checks and Desktop inspection cannot compensate for code that violates them.

- **Activation and rendering:** plugin `apply`, the Client entry, slot components, and optional feature initialization must not throw uncaught exceptions or leave unhandled promise rejections. Put a scoped error boundary around plugin-owned React surfaces when a render failure could escape the plugin and blank or destabilize the surrounding DSH page.
- **Validated input:** validate persisted settings, request bodies, protocol payloads, file metadata, and optional-service results before use; return the existing structured error instead of assuming shapes. Defensive resolvers must accept missing or malformed older settings.
- **Optional capability failure:** a missing Python runtime, language server, browser opener, remote service, or disabled feature must degrade to ordinary editing/saving or a contained status message, never crash the plugin or page.
- **Bounded async work:** use abort signals, discard stale results, and bound retries, timeouts, and polling. Never respawn a failing process in a tight loop or retry an operation indefinitely.
- **Idempotent teardown:** register every route, listener, timer, subprocess, language-server session, observer, and slot effect through the lifecycle disposer; repeated tab close, plugin reload, and Desktop exit must leave no orphan process, listener, timer, or double cleanup.
- **Data safety:** a failure must not clear dirty state, overwrite newer disk content, bypass checked-save or conflict handling, or lose user edits. Preserve the last good state and return an actionable error.
- **Single registration:** register each route, preview id, slot id, settings id, and process session once. Treat duplicate registration as a defect rather than tolerating it.
- **Runtime boundaries:** Client code must not import Node APIs; Host code must not import React, CodeMirror, or DOM objects. Declare Client externals exactly and keep shared runtime singletons such as Schemastery external.
- **Negative coverage:** add tests for malformed settings/input, unavailable optional runtime, initialization failure, stale async completion, repeated teardown, duplicate or unsafe registration, and fallback preservation.

## Candidate identity and freshness

Before validation, record:

```text
Git HEAD and worktree status:
Candidate package version:
DSH Desktop / @deepseek-ai/dsh version:
Desktop profile:
Installation source: local link | npm package
Expected absolute source path or npm version:
```

All evidence must belong to the current candidate. A production, test, build, manifest, patch, dependency, or release-metadata change invalidates the affected evidence. Rebuild after the last relevant change; do not treat an older `lib/` directory, an unchanged Slot id, or a prior Desktop run as current proof.

A version-only metadata change does not by itself invalidate previously observed product behavior, but it does invalidate package identity, packed-artifact, installed-version, and release-consistency evidence. Refresh those checks against the final version before release.

## Automated and package gates

Run the repository gate from the candidate worktree:

```bash
npm run check
```

It must pass typecheck, the full Vitest suite, build, and artifact verification. Then inspect the package that npm would publish without running another lifecycle script:

```bash
npm pack --dry-run --ignore-scripts --json
```

Confirm the reported package name and version and the presence of at least:

- `package.json`;
- `cordis.patch.yml`;
- `lib/index.js` and `lib/index.d.ts`;
- `lib/client.js` and `lib/client/index.d.ts`;
- required protocol declarations, README files, changelog, license, and any newly required runtime assets.

Do not claim package safety from a source-tree build alone. A missing file, unexpected package identity, undeclared external, failed `verify`, or stale generated artifact is `FAIL` and blocks Desktop candidate acceptance and release.

## Local Bundle application

Installing, replacing, enabling, disabling, or removing a Desktop bundle mutates the user's profile and requires explicit user authorization. When authorized, apply the candidate through DSH Plugin Manager using the repository's absolute path; do not invoke profile package managers directly or edit profile files.

Before applying it, inspect the current bundle source and detect conflicts. After applying it, require the mutation receipt to identify the expected bundle and version and report `application: applied` or an explicit restart requirement with no unresolved failure. Verify that:

- the profile dependency is one local link to the expected absolute repository path;
- the profile bundle list contains `dsh-codecraft` exactly once;
- the resolved package version equals the candidate version;
- no second npm-installed or stale linked CodeCraft package is selected;
- unrelated profile patch and plugin configuration remain unchanged.

A newly added bundle may activate through HMR. Replacing an already loaded package, rebuilding `lib/client.js`, or changing Host/Client code requires a full DSH Desktop restart before final runtime or manual evidence. Do not infer fresh code from a successful build, an install receipt, or an unchanged registration id. Unless the repository's actual Client rebuild watcher is verified running, do not promise automatic Client updates.

## Runtime activation checks

After application, and again after the required restart, inspect the running Desktop instance. Require current evidence for the applicable surfaces:

1. Plugin Manager reports `dsh-codecraft` installed, enabled, sourced from the expected local link, and at the candidate version.
2. The Host row `include:codecraft` is active, its Config schema resolves, and its `packageDir` resolves through the expected profile link.
3. The Client document Slot contains active key `dsh-codecraft`.
4. The Plugins settings Slot contains active id `dsh-codecraft`.
5. The document-actions Slot contains active id `dsh-codecraft-html-preview` when that feature remains in scope.
6. An unauthenticated request to `/codecraft/api` reaches CodeCraft's authentication fence (for example its structured `forbidden` response) rather than a generic 404. Never copy cookies or bypass authentication for this probe.
7. No new startup/activation failure or crash report attributable to this candidate is observed. Absence of a crash log is supporting evidence only, not proof of successful UI behavior.

Any missing Host row, failed fiber, unresolved schema, wrong `packageDir`, duplicate route or registration, missing Client contribution, generic 404, or fresh attributable crash is `FAIL`. Stop; do not publish. Preserve diagnostics, return to the earliest affected layer, and re-run every invalidated check after a fix.

## Native smoke and acceptance

Runtime inspection proves registration, not the visible experience. The user must observe at least this smoke set on the actual candidate after restart:

- DSH Desktop starts and the workspace/session opens without an error dialog, repeated reload, blank UI, or crash;
- a supported text file opens in a native DSH file tab using CodeCraft;
- edit, Undo/Redo, immediate save, close, and reopen preserve the expected disk content and stable status;
- CodeCraft settings open and persist applicable changes across restart;
- disabling or an unavailable optional assistance feature does not break ordinary editing and saving;
- DSH Desktop exits normally and restarts without a CodeCraft-related hang or crash.

Add every change-specific positive, negative, conflict, stale-work, teardown, offline, special-path, language-isolation, and platform case from the target `validation.md`. Required macOS and Windows matrices remain independent. Only the user's reported observations may be marked `PASS`.

## Crash, blank-page, or error-loop recovery

At the first candidate-attributable crash, blank page, startup failure, or repeated error notification:

1. Stop testing. Do not repeatedly relaunch, reinstall, or retry the same operation.
2. Capture the candidate revision, package and DSH versions, platform, scenario, timestamp, and the smallest useful log or screenshot evidence.
3. Disable or remove only `dsh-codecraft` through DSH Plugin Manager, then restart if required. Never reset, clean, or hand-repair the whole profile.
4. Confirm DSH Desktop works without the plugin.
5. Record `FAIL`, invalidate dependent Desktop evidence, fix the earliest affected layer, rerun automation and package gates, reinstall the candidate, and repeat the smoke protocol.
6. If safe recovery cannot be completed, report `BLOCKED` and preserve the failure state.

## Release and rollback rules

A release candidate is not releasable until automated/package gates pass, the final candidate is applied and inspected on DSH Desktop, required restart evidence is current, and required native acceptance is user-confirmed. If profile mutation was not authorized or a required platform is unavailable, report the corresponding gate as `BLOCKED` or `NOT VERIFIED`; do not silently waive it.

Before Git tagging, repeat version/package consistency checks after the final metadata update. If the final change was only release metadata, refresh `npm run check`, packed-artifact identity, installed candidate version, and startup/open smoke; retain earlier behavioral acceptance only when no behavior or runtime contract changed and state that reasoning explicitly.

If the candidate fails:

- do not push a release tag or create a GitHub Release;
- do not move an existing npm dist-tag to the failed candidate;
- preserve the failure evidence;
- restore the last known-good npm version or checked-out tag through DSH Plugin Manager only when the user authorizes rollback;
- verify the restored source, active Host row, Client registrations, startup, open/edit/save, exit, and restart before declaring recovery.

After npm publication, an optional but recommended distribution check installs the exact published version, confirms the registry dist-tag, repeats runtime activation and smoke checks, and then restores the local link only if continued development requires it and the user authorizes that profile change.

## Evidence record

Use this compact record in the target validation document or delivery report:

```text
Candidate: <version> at <git SHA>
DSH Desktop: <version and platform>
Package gate: PASS | FAIL | BLOCKED
Bundle source/version: <absolute link or npm spec>
Plugin Manager application: <applied | restart-required | failed>
Host activation/schema/packageDir: PASS | FAIL | NOT VERIFIED
Client registrations: PASS | FAIL | NOT VERIFIED
Route authentication-fence probe: PASS | FAIL | NOT VERIFIED
Restart/startup/open/edit/save/exit smoke: PASS | FAIL | NOT VERIFIED
Full native acceptance by platform: PASS | FAIL | NOT VERIFIED
Fresh crash or activation diagnostics: <none observed | details | NOT VERIFIED>
Rollback readiness/result: <last known good and status>
```
