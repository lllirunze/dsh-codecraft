# DSH CodeCraft v0.2.1-rc.0 Validation Plan

| Field | Value |
| --- | --- |
| Status | Implementation complete; macOS automated validation passed, Windows CI and Desktop acceptance pending |
| Target version | 0.2.1-rc.0 |
| Baseline | 0.2.0 |
| Platforms | Windows and macOS |
| Design | [design.md](design.md) |

## Confirmed Baseline Defect

The v0.2.0 Host manager rejects every non-macOS platform before session creation. Windows therefore reports unavailable without attempting the bundled Pyright launch. This validation plan must first lock that behavior into a failing regression test, then prove that Windows proceeds through real LSP initialization after the fix.

## Automated Acceptance

### Platform policy

- [x] Python Intelligence accepts `darwin` and `win32`.
- [x] Unsupported platforms return `unsupported-platform` without spawning a process.
- [x] Status, synchronization, and completion use the same support policy.
- [x] Platform policy is injected or parameterized for tests rather than mutating `process.platform`.

### Server launch and protocol

- [x] The bundled Pyright entry resolves from the installed dependency.
- [x] The launch specification uses a resolved Node executable and `[node, pyrightEntry, '--stdio']` without shell interpolation.
- [ ] A real Pyright process initializes and completes a request on macOS and Windows CI.
- [ ] Split framing, malformed messages, cancellation, timeout, bounded restart, document replay, and shutdown tests remain green.
- [ ] Spawn failure, early exit, initialization timeout, and disposal reject cleanly without an unhandled rejection.

### Windows environment and paths

- [x] Unit coverage accepts a valid explicit absolute `python.exe` configuration and rejects malformed configuration.
- [x] Unit coverage proves `.venv\\Scripts\\python.exe` is preferred over PATH fallback.
- [x] Unit coverage proves `venv\\Scripts\\python.exe` is used when `.venv` is absent.
- [ ] Missing Python is distinguishable from missing or failed Pyright.
- [ ] Workspace and document URIs are correct for drive letters, spaces, Unicode, and a non-system drive.
- [ ] Canonical containment remains correct with Windows separators and case behavior.
- [ ] `.py`, `.pyi`, and `.pyw` documents share the same semantic path.
- [ ] UNC behavior is tested and either supported or rejected with a documented reason.

### Existing feature parity

- [ ] Import completion works in a multi-file project.
- [x] On macOS, an inferred object member from another project file appears after `instance.`.
- [x] On macOS, unsaved content is synchronized before completion.
- [ ] A selected virtual environment contributes installed dependency symbols.
- [ ] Completion selection, acceptance, ranking, and one-step Undo remain correct.
- [ ] Tab close, workspace change, plugin disposal, and application exit release Pyright.

### Regression and packaging

- [ ] macOS retains the complete v0.2.0 Python Intelligence behavior.
- [ ] Base editing, manual save, auto-save, drafts, conflicts, brackets, and indentation pass on both CI platforms.
- [ ] `npm run check` passes on `macos-latest` and `windows-latest`.
- [x] On macOS, `npm pack --dry-run --json` includes version `0.2.1-rc.0` and pinned Pyright as a production dependency.
- [ ] The packed artifact installs into a clean Desktop profile on both target platforms.

## Windows Desktop Acceptance

Use a published or packed `0.2.1-rc.0` artifact, not only a linked source checkout.

- [ ] DSH Desktop cold-starts with CodeCraft enabled.
- [ ] Opening `main.py` transitions from `Python: Starting` to `Python: Ready`.
- [ ] `service.` offers a member defined in another file.
- [ ] An unsaved new member in another open file appears in completion.
- [ ] A dependency installed in workspace `.venv` appears in import and member completion.
- [ ] Repeat in a path containing spaces and non-ASCII characters.
- [ ] Repeat on a non-system drive.
- [ ] Invalid interpreter configuration reports a reason and recovers after correction.
- [ ] Missing or failed Pyright leaves ordinary editing and saving functional.
- [ ] Close tabs, switch workspaces, and quit Desktop; confirm no Pyright process remains.
- [ ] Restart Desktop and repeat the core completion scenario.

## macOS Regression Acceptance

- [ ] DSH Desktop cold-starts with CodeCraft enabled.
- [ ] Existing import, cross-file, unsaved-document, member, and `.venv` completion still works.
- [ ] Status and error messages remain useful and do not expose complete private paths.
- [ ] Save, auto-save, drafts, conflicts, brackets, and indentation do not regress.
- [ ] Desktop exit leaves no Pyright process.

## Release Gates

Do not publish or promote v0.2.1-rc.0 until both CI operating systems pass, the packed artifact succeeds in Windows DSH Desktop, the macOS regression is recorded, and the package version, lockfile version, changelog heading, tag, GitHub Pre-release title, and release heading all use `0.2.1-rc.0`.

Publish the npm package with an `rc` dist-tag. Do not update `latest` for this preview. If a released rc.0 artifact is defective, publish rc.1; never overwrite an npm version.

## Recorded Automated Evidence

Recorded on 2026-11-05 from macOS:

- `npm run check` passed: strict type checking, 12 Vitest files with 92 tests, production build, and package verification.
- Real bundled Pyright completed an unsaved cross-file member request from a workspace path containing spaces and Unicode.
- The provider manager waited for real LSP initialization before reporting `ready` and disposed the managed process afterward.
- Build verification loaded the browser bundle with both macOS and Windows platform stubs.
- `npm pack --dry-run --json` produced `dsh-codecraft@0.2.1-rc.0` with the expected package contents.

This evidence does not replace the pending `windows-latest` CI result or Windows DSH Desktop acceptance above.

