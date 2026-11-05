# DSH CodeCraft v0.2.1-rc.0 Windows Python Intelligence

| Field | Value |
| --- | --- |
| Status | Implemented; macOS automated validation passed, Windows CI and Desktop acceptance pending |
| Target version | 0.2.1-rc.0 |
| Baseline | 0.2.0 |
| Release type | Preview / release candidate |
| Release theme | Bring the existing Python Intelligence feature set to Windows |
| Platform scope | Python Intelligence: macOS and Windows; Linux remains unsupported |

## Purpose

v0.2.1-rc.0 makes the Python Intelligence capabilities already shipped in v0.2.0 available in DSH Desktop on Windows. It does not add new semantic features. Completion, import completion, cross-file symbols, inferred members, unsaved-document synchronization, environment selection, bounded restart, and managed teardown must behave consistently on macOS and Windows.

This preview is intentionally separate from the broader [v0.2.1 design](../v0.2.1/design.md). Python indentation, triple-quote refinement, Docstring generation, and module extraction remain in the stable-version plan and are not release claims for rc.0.

## Confirmed Findings

Source inspection identifies the immediate cause of `Python: Unavailable` on Windows:

- `IntelligenceManager.status()` returns unavailable whenever `process.platform !== 'darwin'`.
- `IntelligenceManager.#assertAvailable()` rejects sync and completion requests under the same macOS-only condition.
- Windows is therefore rejected before CodeCraft attempts to resolve Node, start Pyright, initialize LSP, or inspect a Python environment.

Several cross-platform foundations already exist:

- Pyright `1.1.414` is a pinned production dependency.
- The default launch path resolves the installed `pyright/langserver.index.js` entry and starts it through a resolved Node executable with an explicit argv array and `--stdio`.
- DSH's managed subprocess contract is shell-free and supports platform-aware executable lookup and managed Windows process jobs.
- Python environment discovery already checks `.venv` and `venv`, using `Scripts/python.exe` on Windows and `bin/python` on POSIX.
- LSP workspace and document URIs already use Node's `pathToFileURL()` instead of manual `file:///` concatenation.
- Workspace paths are canonicalized and constrained on the Host before they reach LSP.

The current automated evidence is incomplete for Windows:

- CI runs only on `macos-latest`.
- Python environment tests create POSIX `bin/python` fixtures and use `chmod`.
- the real-Pyright integration test has not been exercised by this repository on Windows CI;
- build verification stubs a macOS browser platform only;
- no published-package acceptance has been recorded on Windows DSH Desktop.

The platform gate is a confirmed defect. The remaining Windows launch, path, environment, and lifecycle risks must be validated rather than presumed broken.

## Required Scope

### P0 functionality

| ID | Requirement | Acceptance |
| --- | --- | --- |
| WIN-PY-01 | Platform enablement | Python Intelligence accepts `darwin` and `win32`, rejecting unsupported platforms with a specific reason |
| WIN-PY-02 | Managed Pyright launch | The bundled Pyright JS entry starts through DSH's resolved Node executable without a shell |
| WIN-PY-03 | Windows paths and URIs | Drive letters, spaces, Unicode paths, and different drives produce valid contained paths and file URIs |
| WIN-PY-04 | Windows environments | Explicit interpreters and workspace `.venv\\Scripts\\python.exe` / `venv\\Scripts\\python.exe` are recognized |
| WIN-PY-05 | Feature parity | Existing import, cross-file, inferred-member, and unsaved-document completion works on Windows |
| WIN-PY-06 | Failure isolation | Server, interpreter, workspace, and initialization failures degrade intelligence without blocking editing or Desktop startup |
| WIN-PY-07 | Lifecycle | Tab close, workspace change, plugin disposal, and Desktop exit do not leave Pyright processes behind |
| WIN-PY-08 | macOS regression | All v0.2.0 Python and base-editor behavior remains intact on macOS |
| WIN-ARCH-01 | Future-language safety | Platform support remains provider-owned; shared LSP and editor layers receive no Python-specific Windows branches |

### Explicitly out of scope

- Python-aware Enter indentation and branch alignment;
- triple-quote behavior changes and Google Style Docstrings;
- hover, diagnostics, signature help, navigation, rename, or code actions;
- new semantic languages, frameworks, or ecosystems;
- automatic Python, Node, Pyright, or dependency installation;
- Linux support;
- a new LSP client, process supervisor, or language-module registry;
- broad UI redesign.

## Architecture Decision

Platform support is a property of a concrete language provider and its external tools, not of semantic intelligence as a whole.

```text
shared CodeMirror completion bridge
          ↓
shared Host intelligence lifecycle
          ↓
Python provider policy ── supports darwin + win32
          ↓
shared platform-neutral LSP session
          ↓
DSH managed subprocess execution world
          ↓
resolved Node executable + bundled Pyright JS
```

The implementation must not add Windows or Python branches to `src/host/lsp/connection.ts` or `src/host/lsp/session.ts` unless a failing cross-platform protocol test proves a shared defect. Future languages must be able to use the same LSP connection on either supported platform while owning their own server and environment discovery.

For rc.0, a small Python support-policy helper is sufficient. A generalized manifest or provider registry should not be created solely for this release. The helper should accept the platform as an argument so unit tests can cover `darwin`, `win32`, and unsupported values without mutating the global process object.

## Implementation Plan

### 1. Replace the hard-coded platform gate

Move the support decision out of the manager's inline `process.platform !== 'darwin'` checks and into the Python language boundary, for example:

```typescript
type HostPlatform = NodeJS.Platform

function supportsPythonIntelligence(platform: HostPlatform): boolean {
  return platform === 'darwin' || platform === 'win32'
}
```

Both status and request admission must use the same policy. Unsupported platforms return a stable diagnostic and never start a server. Windows must proceed into the existing session creation path.

Do not force the UI to `Ready`. Readiness still requires a real initialized LSP session.

### 2. Preserve the safe default Pyright launch

The existing default launch is already the preferred Windows strategy:

```text
resolveExecutable('node')
  + require.resolve('pyright/langserver.index.js')
  + --stdio
```

It avoids `.cmd` wrappers, shell quoting, implicit `npx` downloads, and dependence on a global Pyright installation. rc.0 should keep this path and add Windows evidence around it.

An explicit server path remains supported when it is an absolute JavaScript entry or a directly executable program. Batch-file paths must not be advertised until DSH-managed execution is tested for that exact case. CodeCraft must never construct `cmd.exe /c` command text from workspace input.

### 3. Make environment discovery testable by platform

Environment discovery should accept or derive a platform policy in one place:

- Windows workspace candidates: `.venv\\Scripts\\python.exe`, then `venv\\Scripts\\python.exe`;
- macOS candidates: `.venv/bin/python`, then `venv/bin/python`;
- configured interpreter paths must be absolute and refer to a usable file;
- PATH fallback should prefer `python` on Windows and may evaluate the `py` launcher only through a bounded, explicit argv probe that returns a real interpreter path;
- macOS retains its current `python3`, then `python` fallback.

Absence of a Python interpreter does not necessarily prevent Pyright from starting. The server may run in a limited environment and report no interpreter path. Server launch failure and interpreter discovery failure must remain distinguishable.

Windows executable validation must not assume POSIX permission bits. Tests should inject the platform and filesystem probes rather than attempting to fake Windows behavior by changing `process.platform` on macOS.

### 4. Validate paths and URIs on Windows

Continue to use `realpath`, `path.relative`, `pathToFileURL`, and the current Host containment boundary. Add Windows-native tests for:

- `C:\\Users\\Alice\\project\\main.py`;
- paths containing spaces;
- non-ASCII user and project directories;
- a workspace and file on a non-system drive;
- mixed path spelling and case that still resolves to the canonical workspace;
- `.py`, `.pyi`, and `.pyw` documents;
- UNC paths as an explicit evaluation case.

UNC support is not claimed unless it passes DSH Desktop acceptance. An unsupported execution-world path must produce a bounded diagnostic, never a malformed URI or Host crash.

### 5. Improve diagnostics without exposing private paths

The current free-form message is useful but not sufficient for repeatable support. Extend status results with an optional stable reason while keeping existing fields compatible:

```typescript
type IntelligenceUnavailableReason =
  | 'unsupported-platform'
  | 'server-not-found'
  | 'spawn-failed'
  | 'initialize-timeout'
  | 'workspace-invalid'
  | 'environment-limited'
  | 'server-exited'
```

The status bar may retain `Python: Unavailable`; its tooltip should contain a short actionable message. Logs may record the phase, platform, exit code, and sanitized error class, but must not upload data or expose complete personal paths, environment variables, credentials, or source text.

`environment-limited` should not be treated as a total server failure when completion remains functional.

### 6. Keep failures away from Desktop startup

Pyright remains lazy and workspace-scoped. Plugin application must not synchronously wait for Node, Python, or Pyright. Session creation errors are caught by status or request handling and must not escape as unhandled rejections.

Existing bounded initialization, completion, shutdown, and managed-process cleanup remain authoritative. Windows tests must prove that spawn rejection, early exit, initialization timeout, cancellation, and disposal do not disable ordinary editing, saving, drafts, or DSH Desktop startup.

### 7. Add real cross-platform CI

Change the check job to a matrix containing at least:

```yaml
os: [macos-latest, windows-latest]
```

Both platforms run `npm ci` and `npm run check`. Platform-specific fixtures use native executable names and path rules. The real Pyright integration test must run on both platforms. Avoid weakening a Windows failure into a skipped test unless the release explicitly excludes that capability.

The publish job may remain on one platform because the package is platform-independent, but `v0.2.1-rc.0` must not be published unless the commit has passed both CI legs.

## Future Language Compatibility

This release establishes the following rule for later language implementations:

- shared LSP framing, request correlation, document synchronization, cancellation, and teardown are platform-neutral;
- each language provider declares and tests its supported host platforms and server launch policy;
- language-specific interpreter, SDK, compiler, or runtime discovery stays under that language's Host module;
- platform executable lookup goes through DSH `ctx.subprocess`, not browser APIs or shell strings;
- Windows support is tested on Windows CI, not inferred from macOS mocks;
- a new language cannot reduce the platform support of an already supported language;
- framework and ecosystem providers inherit the parent language's runtime capability and add only their own constraints.

These rules are also recorded in the shared [intelligence module conventions](../../guide/intelligence-module-conventions.md).

## Delivery Stages

### Stage A: reproduce and instrument

1. Confirm the hard-coded platform rejection in an installed Windows Desktop build.
2. Capture the status/request path before changing it.
3. Add platform-policy and Windows environment tests that fail on the v0.2.0 baseline.
4. Confirm DSH's managed subprocess service resolves Node in the Windows Desktop execution environment.

### Stage B: enable Windows minimally

1. Replace the macOS-only gate with Python provider support for `darwin` and `win32`.
2. Make environment selection platform-testable and correct Windows executable validation.
3. Preserve the bundled Pyright JS launch path.
4. Add stable unavailable reasons and sanitize messages.

### Stage C: cross-platform verification

1. Run the full suite and real Pyright integration on macOS and Windows CI.
2. Validate spaces, Unicode, drive letters, `.venv`, missing interpreter, server failure, cancellation, restart, and cleanup.
3. Install the packed artifact into real Windows DSH Desktop and repeat the multi-file completion scenario.
4. Re-run the v0.2.0 macOS acceptance and base-editor regressions.

### Stage D: preview release

1. Record evidence in [validation.md](validation.md).
2. Update README platform claims and CHANGELOG only for behavior actually verified.
3. Align `package.json`, `package-lock.json`, tag, release title, and release heading at `0.2.1-rc.0`.
4. Verify `npm pack --dry-run --json` and the installed tarball.
5. Publish with an `rc` dist-tag and create a GitHub Pre-release; do not move `latest` unintentionally.

## Risks and Controls

| Risk | Control |
| --- | --- |
| Removing the gate reveals a real launch defect | Add phase-specific diagnostics and fail intelligence only |
| Windows `.cmd` quoting or injection | Use resolved Node plus Pyright JS and explicit argv |
| POSIX executable checks reject Windows files | Use platform-appropriate validation with native tests |
| Terminal PATH differs from Desktop Host | Resolve through DSH subprocess in the Host execution world |
| URI or containment errors on drive-letter paths | Use Node path/URL APIs and Windows-native tests |
| A Windows fix regresses macOS | Keep platform policy narrow and require both CI legs |
| Future languages copy Python platform logic | Keep shared LSP neutral and provider policy language-owned |
| RC is mistaken for stable v0.2.1 completion | Keep scope and prerelease installation explicit |

## Definition of Done

v0.2.1-rc.0 is ready when the published package reaches a real `Ready` Pyright session in Windows DSH Desktop, provides the existing v0.2.0 Python completion scope across representative Windows paths and environments, shuts down without residual language-server processes, passes macOS and Windows CI, preserves macOS behavior, and records actionable failure evidence without endangering ordinary editing or Desktop startup.

## References

- [DSH subprocess service](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subprocess/subprocess/README.md)
- [DSH local subprocess provider](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subprocess/subprocess-local/README.md)
- [Node.js URL API](https://nodejs.org/api/url.html#urlpathtofileurlpath-options)
- [Node.js file-system API](https://nodejs.org/api/fs.html#fspromisesaccesspath-mode)
- [Node.js child-process API](https://nodejs.org/api/child_process.html)
- [Pyright installation](https://github.com/microsoft/pyright/blob/main/docs/installation.md)
- [npm dist-tags](https://docs.npmjs.com/adding-dist-tags-to-packages/)
- [Semantic Versioning](https://semver.org/)

