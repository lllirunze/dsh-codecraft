# DSH CodeCraft v0.3.0 Java Intelligence Design

| Field | Value |
| --- | --- |
| Status | Implemented for automated validation; native macOS and Windows acceptance pending |
| Target version | 0.3.0 |
| Baseline | 0.2.2 |
| Release theme | Reliable Java semantic completion and a reusable multi-language provider boundary |
| Platforms | macOS and Windows |

## Purpose

v0.3.0 adds the first Java semantic-intelligence provider to CodeCraft. Opening a `.java` file should retain the existing native-tab editor while gaining real JDT LS completion for standalone files, standard-library members, imports, project symbols, and ordinary Maven projects. Java Intelligence must reach an evidence-backed `Java: Ready` state on both macOS and Windows and degrade without affecting editing or saving when its runtime is unavailable.

This release is intentionally narrower than a Java IDE. It does not add Java execution, builds, tests, debugging, Javadoc generation, framework intelligence, or build-file editing. Hover, signature help, definition navigation, references, diagnostics UI, and Gradle import are evidence-gated follow-ups and are not release requirements.

## Repository Audit

The repository already recognizes `.java` files and supplies CodeMirror Java syntax highlighting through `@codemirror/lang-java`. v0.3.0 must preserve that behavior rather than presenting syntax support as new semantic intelligence.

The current semantic stack is reusable in concept but Python-specific in implementation:

- `CodeCraftBody` activates semantic synchronization and completion only for `language.id === 'python'` and reads Python-only settings.
- `IntelligenceManager` owns one Pyright policy, Python path matching, Python errors, and Python launch discovery.
- `LspSession` hard-codes `languageId: 'python'`, Pyright-oriented initialization, and Python runtime metadata.
- settings expose only `pythonIntelligence`; the route names and completion wire types are mostly language-neutral.
- authenticated workspace resolution, request cancellation, stale-revision rejection, completion conversion, managed subprocesses, and conflict-safe saving are already suitable shared foundations.

The implementation therefore needs a small provider contract and parameterized LSP session, not a second copied manager and not a speculative inheritance hierarchy. The conceptual `BaseIntelligence` capability remains composition through registries, interfaces, protocol types, and shared lifecycle services, as required by [Intelligence Module Conventions](../../guide/intelligence-module-conventions.md).

## Feasibility Gate

Implementation uses Eclipse JDT LS 1.57.0 as the pinned validation target. The official archive is `jdt-language-server-1.57.0-202602261110.tar.gz`, with SHA-256 `f7ffa93fe1bbbea95dac13dd97cdcd25c582d6e56db67258da0dcceb2302601e`.

The selected distribution route is an explicit user-provided extraction. CodeCraft neither downloads JDT LS while opening a file nor runs third-party post-install scripts. The user downloads the official archive, verifies its checksum, extracts it to a user-controlled tools directory, and selects that directory under **Settings → CodeCraft → Java Intelligence**. `JDTLS_HOME` is the offline/managed-environment fallback. Offline use continues after extraction. To upgrade, quit DSH, extract the new reviewed build to a separate directory, update the setting, and cold-start DSH; old user-owned distributions are removed manually only after they are no longer selected. This keeps the npm package small, makes network consent explicit, and avoids modifying unrelated editor configuration. A future managed installer requires a separate consent, integrity, storage, cancellation, and cleanup design.

Native acceptance remains a release-blocking Stage 0. Java UI may claim `Ready` only after the following items are proven on the exact dependency and DSH versions selected for release.

1. Pin one JDT LS build and record its official source, archive checksum, layout, license obligations, and extracted/package size.
2. Prove a JDK 21+ JVM can be launched through DSH `ctx.subprocess` with piped stdio on native macOS and Windows.
3. Complete `initialize`, `didOpen`, and a real completion request using the same JDT LS archive on both platforms.
4. Verify a public, writable, user-level cache/storage location for JDT LS assets and per-workspace `-data`; never write generated state into the source repository.
5. Validate the selected user-provided distribution route, including integrity instructions, offline behavior, upgrades, and cleanup.
6. Verify Maven import behavior and any network or external-task activity against DSH workspace trust and permission boundaries.

The supported distribution route must be decided before feature implementation. Explicit, integrity-checked download into DSH-owned cache is preferred if a public storage and consent flow exists. A user-configured extracted JDT LS directory is the required offline fallback. Bundling is allowed only after package-size and Eclipse Public License 2.0 review. CodeCraft must not silently download a large server on first file open, assume `jdtls` is on `PATH`, or run an unverified script.

The implementation-machine audit found Java 21 on macOS arm64, but that is local feasibility evidence only. It is not Windows acceptance and does not select the release JDT LS build.

## Runtime Model

### Tooling and project runtimes

JDT LS currently requires Java 21 or newer to start. This tooling JVM is separate from the JDK used by the user's project:

- `serverRuntime`: validated Java executable used to launch JDT LS;
- `projectRuntime`: optional project JDK/toolchain communicated through supported JDT LS configuration.

An older Java 8, 11, or 17 project may remain valid while JDT LS runs on JDK 21+. CodeCraft must never rewrite `JAVA_HOME`, install a JDK without explicit consent, or imply that the project must migrate to Java 21.

Server runtime discovery order is:

1. explicit Java Intelligence tooling-JDK setting;
2. `JAVA_HOME/bin/java` or `JAVA_HOME\\bin\\java.exe` in the actual Host process environment;
3. `java` resolved through DSH's managed subprocess service.

Every candidate must execute `java -version`, parse a valid major version, and satisfy the pinned server's minimum. GUI-launched Desktop behavior is authoritative; Terminal or PowerShell success alone is insufficient.

### JDT LS launch

The Java provider launches the validated Java executable with an argv array, never an interpolated shell command. It scans the selected distribution for exactly one valid `org.eclipse.equinox.launcher_*.jar`, selects `config_mac` on `darwin` or `config_win` on `win32`, and assigns an isolated writable `-data` directory per canonical workspace. File paths and URIs use Node path and URL APIs, including Windows drive letters, spaces, Unicode, and backslashes.

The exact JVM flags come from the pinned JDT LS distribution or its documented launcher. They must not be copied indefinitely from an unrelated editor. Missing launcher, platform configuration, cache permission, or suitable Java produces a stable unavailable reason and never blocks ordinary Java editing.

## Architecture

```text
CodeMirror Java document
  -> language-aware semantic adapter
  -> authenticated CodeCraft Host API
  -> IntelligenceManager provider registry
  -> Java provider and workspace session
  -> shared parameterized LSP session
  -> DSH managed subprocess
  -> JDK 21+ running JDT LS
```

### Shared provider boundary

Introduce the minimum contract needed by both Python and Java. A provider owns language matching, settings, launch resolution, LSP language ID, initialization options, readiness, and public failure mapping. `IntelligenceManager` selects the provider from the Host-validated file path and keys sessions by provider plus canonical workspace. The browser may send document state but must not choose an arbitrary executable, workspace root, or provider identity.

`LspSession` becomes server-neutral through constructor configuration. It continues to own document URI/generation/revision synchronization, completion, cancellation, replay, and bounded shutdown. Python remains a provider over the same behavior and must retain all v0.2.2 reliability guarantees.

Likely delivered files, created only when they hold working behavior:

```text
src/client/languages/java/
└── index.ts                         Java editor registration when extraction is required

src/host/intelligence/
├── manager.ts                       provider selection and shared session ownership
└── provider.ts                      smallest shared provider contract

src/host/languages/java/
├── index.ts                         Java provider registration
├── environment.ts                   tooling/project JDK discovery and validation
└── jdtls.ts                         distribution validation and launch configuration
```

Tests remain flat under `tests/`, with fixtures only where multi-file or Maven projects are clearer than inline samples. Empty `features/`, `services/`, framework, or ecosystem directories must not be created.

### Browser and settings

The client chooses semantic behavior from language capability metadata instead of a Python equality check. The existing completion UI remains shared. Status text becomes language-aware without allowing results from one language, tab generation, revision, or workspace to cross into another.

Java settings should expose only delivered controls: enablement, semantic completion, an optional tooling-JDK path, an optional project-JDK path, and an optional extracted JDT LS path when required by the selected distribution route. Malformed paths fall back safely. A managed download, if selected, requires an explicit action and visible progress; it is not triggered by typing or opening a file.

## Required Scope

| ID | Requirement | Acceptance |
| --- | --- | --- |
| JAVA-01 | Provider architecture | Python and Java use the same coordinator, protocol, completion UI, LSP framing, cancellation, and teardown without importing each other |
| JAVA-02 | Runtime discovery | Explicit, `JAVA_HOME`, and PATH tooling JVMs are validated; JDK below the pinned minimum is rejected actionably |
| JAVA-03 | Cross-platform launch | One pinned JDT LS distribution initializes through `config_mac` and `config_win` using argv-based managed subprocesses |
| JAVA-04 | Real readiness | `Java: Ready` requires live process, completed initialization, synchronized document, and a successful semantic request; indexing is not labelled Ready |
| JAVA-05 | Standalone completion | Variables, classes, interfaces, fields, methods, and constructors complete in a standalone `.java` file |
| JAVA-06 | Standard library and imports | `String` members and `import java.util.` produce correct JDT LS candidates |
| JAVA-07 | Cross-file completion | Symbols and members resolve across Java files in one workspace without stale or cross-tab results |
| JAVA-08 | Maven project support | A normal `pom.xml` and `src/main/java` project imports, and resolvable dependencies contribute completion candidates |
| JAVA-09 | Failure isolation | Missing runtime/server, bad archive, timeout, exit, cache failure, and import failure leave syntax editing, drafts, and saving operational |
| JAVA-10 | Lifecycle | Sessions are lazy, workspace-scoped, isolated, cancellation-aware, recovery-bounded, and terminated on final close, disable, unload, and exit |
| JAVA-11 | Platform paths | Spaces, Unicode, macOS paths, Windows drive letters, separators, executable suffixes, and file URIs are handled by platform APIs |
| JAVA-12 | Python regression | Python Ready state, completion, Docstrings, callable insertion, indentation, settings, and process cleanup remain unchanged |

## Status Semantics

| State | Meaning |
| --- | --- |
| `Java: Disabled` | Java Intelligence is disabled by configuration |
| `Java: Unavailable` | A required tooling JVM, JDT LS distribution, subprocess capability, or writable cache is unavailable |
| `Java: Starting` | JVM launch or LSP initialization is in progress |
| `Java: Indexing` | Shown only when a verified JDT LS progress signal proves project import/indexing is active |
| `Java: Ready` | Initialization and document sync completed and a semantic request succeeded for the active session |
| `Java: Error` | The active server exited, timed out, or encountered a protocol/cache/import failure |

If no reliable indexing signal exists, CodeCraft remains `Starting` with explanatory text until the readiness probe succeeds; it must not infer indexing from elapsed time. Public messages use stable reasons such as `jdk-too-old`, `jdtls-not-found`, `distribution-invalid`, `platform-config-missing`, `cache-unwritable`, `initialize-timeout`, and `server-exited` without exposing private paths or source text.

## Lifecycle, Trust, and Performance

- Java starts only when an eligible Java document requests intelligence; DSH startup does not prewarm a JVM.
- Tabs in one provider/workspace share one session; Python and Java and separate workspaces never share writable server state.
- Old completion requests are cancelled and rejected by workspace, provider, URI, tab generation, and document revision checks.
- Recovery is bounded and uses backoff; repeated failure settles as unavailable rather than spawning JVMs indefinitely.
- Closing the last owned Java document retires the session and its process. Cache deletion is a separate explicit maintenance action.
- JVM startup and indexing never block typing, saving, or renderer mounting. Memory and startup time are measured on representative standalone and Maven workspaces.
- Maven import may access dependencies or invoke tooling internally. It must honor the selected JDT LS configuration and DSH trust/permission model; CodeCraft does not execute arbitrary project scripts or shell commands itself.
- Logs are bounded and redact source text, credentials, environment values, and unnecessary private paths.

## Out of Scope

- Java execution, compilation, tests, debugging, terminals, or build buttons;
- Javadoc generation, Java-specific smart indentation beyond current CodeMirror behavior, formatting, Checkstyle, or PMD;
- Spring Boot, MyBatis, Android, Jakarta, or other framework intelligence;
- Maven/Gradle build-file completion or dependency management;
- automatic JDK installation or mutation of system environment variables;
- deep inheritance introduced only to match a conceptual base class;
- Hover, signature help, navigation, references, diagnostics UI, code actions, or Gradle import unless separately approved after every P0 gate passes.

## Implementation Plan

### Stage 0: native feasibility and distribution decision

Pin and audit JDT LS, prove initialize/completion and cleanup on macOS and Windows, validate JDK 21+, choose cache/storage and distribution behavior, and record Maven trust implications. Failure blocks the Java feature rather than producing a simulated Ready state.

### Stage 1: provider extraction without regression

Parameterize the shared session and manager, register Python as the first provider, replace browser Python equality checks with capability selection, and prove the full Python suite and native behavior remain unchanged.

### Stage 2: Java environment and lifecycle

Add settings, Java runtime/JDT LS validation, platform launch policy, isolated data directories, Java provider registration, stable errors, and lazy cleanup. Test malformed distributions and every supported path form before semantic features.

### Stage 3: semantic completion

Deliver standalone, standard-library, import, cross-file, and ordinary Maven completion in that order. Add deterministic stale-request, workspace isolation, indexing/readiness, crash, cancellation, and restart tests.

### Stage 4: native and release validation

Complete macOS and Windows Desktop scenarios, measure resource behavior, validate packaging and licensing, update README and changelog, and only then align package version, lockfile, tag, and Release metadata to `0.3.0` / `v0.3.0`.

## Definition of Done

v0.3.0 is complete when a pinned and integrity-checked JDT LS distribution has a documented delivery path; native macOS and Windows both reach a truthful `Java: Ready`; standalone, standard-library, import, cross-file, and Maven completion return verified semantic candidates; JDK 21+ tooling is clearly separated from project JDK configuration; every failure degrades to the existing editor; sessions, caches, cancellation, and process cleanup are bounded and isolated; Python v0.2.2 behavior does not regress; package size and license obligations are documented; and all automated, packaging, and native acceptance gates pass.

## References

- [Eclipse JDT Language Server](https://github.com/eclipse-jdtls/eclipse.jdt.ls/blob/main/README.md)
- [JDT LS launcher](https://github.com/eclipse-jdtls/eclipse.jdt.ls/blob/main/org.eclipse.jdt.ls.product/scripts/jdtls.py)
- [VS Code Java tooling and project JDK guidance](https://github.com/redhat-developer/vscode-java)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [Intelligence Module Conventions](../../guide/intelligence-module-conventions.md)
