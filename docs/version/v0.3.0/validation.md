# DSH CodeCraft v0.3.0 Validation Plan

| Field | Value |
| --- | --- |
| Status | Planned; implementation and validation not started |
| Target version | 0.3.0 |
| Baseline | 0.2.2 |
| Platforms | macOS and Windows |
| Design | [design.md](design.md) |

## Evidence Rules

- Leave every item unchecked until it passes against the pinned v0.3.0 dependency set.
- Mocked platform tests are automated policy evidence, not native Windows or macOS acceptance.
- `Java: Ready` requires a live JDT LS exchange and correct semantic result; a rendered label or lexical candidate is insufficient.
- Record the exact DSH, Node, JDK, JDT LS, architecture, installation source, and distribution checksum used for native acceptance.
- Use disposable workspaces and caches for failure, corruption, and import tests.
- Do not add P1 features until all P0 behavior is stable on both platforms.

## Stage 0 Feasibility Gate

### Dependency and distribution audit

- [ ] Pin one official JDT LS build and archive URL.
- [ ] Record archive checksum, extracted size, npm package-size impact for each proposed distribution route, and expected cache footprint.
- [ ] Review Eclipse Public License 2.0 and third-party notices for download, cache, bundling, and redistribution obligations.
- [ ] Verify the archive contains one discoverable Equinox launcher and valid `config_mac` and `config_win` directories.
- [ ] Select explicit download/cache, user-provided installation, or reviewed bundle as the primary route.
- [ ] Provide a user-configured extracted JDT LS directory as an offline fallback.
- [ ] Verify corrupted, incomplete, mismatched, or unsupported distributions fail before JVM launch.
- [ ] Verify upgrades and cleanup cannot delete source workspaces or unrelated user data.

### DSH and JVM proof

- [ ] Record the exact public DSH subprocess and storage/cache contracts used by the implementation.
- [ ] Launch the same pinned JDT LS build through `ctx.subprocess` on native macOS and Windows.
- [ ] Complete `initialize`, `initialized`, `didOpen`, completion, shutdown, and exit on both platforms.
- [ ] Confirm all launches use argv arrays without a shell.
- [ ] Confirm the Host process environment, not an interactive terminal, is used for discovery.
- [ ] Verify Java 21+ succeeds and Java 8/11/17 tooling JVM candidates produce `jdk-too-old` without launching JDT LS.
- [ ] Verify older project language levels remain configurable independently from the server runtime.
- [ ] Select and validate a writable per-workspace JDT LS data location outside the source repository.
- [ ] Record Maven import network, build-tool, workspace-trust, and permission behavior.

## Automated Acceptance

### Provider architecture

- [ ] Python and Java register through one provider contract without importing sibling implementations.
- [ ] Provider selection uses the Host-validated file path and rejects unsupported files.
- [ ] Session keys include canonical workspace and provider so Python, Java, and separate workspaces cannot collide.
- [ ] Shared LSP sessions accept language ID, launch argv, initialization options, and provider metadata without Python constants.
- [ ] The client selects semantic capability from language metadata rather than a Python equality check.
- [ ] Existing authenticated Session-derived workspace authority remains unchanged.
- [ ] Browser requests cannot inject an executable, workspace root, JDT LS path, or arbitrary provider ID.

### Runtime and distribution validation

- [ ] Explicit tooling-JDK configuration has priority over `JAVA_HOME` and PATH.
- [ ] `JAVA_HOME/bin/java` and `JAVA_HOME\\bin\\java.exe` are constructed correctly.
- [ ] PATH lookup uses DSH `resolveExecutable` and the actual Host environment.
- [ ] `java -version` parsing handles supported vendor output and rejects malformed or insufficient versions.
- [ ] Server and project runtimes remain distinct in settings and initialization.
- [ ] The Equinox launcher is discovered by pattern without hard-coded version names and ambiguity is rejected.
- [ ] `darwin` selects `config_mac`; `win32` selects `config_win`; every other Host platform is unavailable.
- [ ] Java, launcher, configuration, and data paths with spaces and Unicode remain individual argv entries.
- [ ] Windows drive-letter paths and file URIs round-trip through platform APIs.
- [ ] Cache/data directories are unique by canonical workspace and cannot escape the approved cache root.
- [ ] Download, if delivered, requires explicit consent, verifies integrity before extraction, and supports cancellation and offline failure.

### LSP lifecycle and readiness

- [ ] Java sessions start lazily and one workspace reuses one session across Java tabs.
- [ ] Different workspaces and providers use distinct processes and writable data directories.
- [ ] `didOpen`, full-text `didChange`, replacement, replay, and `didClose` preserve URI, generation, and revision ownership.
- [ ] A late response from an older revision, tab generation, workspace, or provider is discarded.
- [ ] Abandoned completion sends `$/cancelRequest` when already in flight.
- [ ] A transport failure performs only the configured bounded recovery and replay.
- [ ] Repeated launch, initialization, import, or protocol failure settles without a restart loop.
- [ ] Closing the final Java document, disabling Java, unloading the plugin, and quitting DSH terminate the owned process.
- [ ] `Java: Starting` covers launch and initialization without blocking editor input.
- [ ] `Java: Indexing` appears only from a verified server progress signal.
- [ ] `Java: Ready` appears only after initialization, active-document synchronization, and a successful semantic request.

### Semantic completion

- [ ] A standalone file completes local variables, classes, interfaces, fields, methods, and constructors.
- [ ] `String text = "hi"; text.` includes correct `String` members.
- [ ] `import java.util.` includes appropriate package and class candidates.
- [ ] Two Java files in one workspace complete user-defined types and members across files.
- [ ] Unsaved Java content participates in cross-file completion.
- [ ] A normal Maven `pom.xml` plus `src/main/java` layout is recognized.
- [ ] A resolvable Maven dependency contributes expected third-party types and members.
- [ ] Maven import failure is actionable and does not disable standalone Java editing.
- [ ] Completion ranking, text edits, snippets, additional imports, and callable insertion remain safe through the shared CodeMirror adapter.
- [ ] No lexical-only fallback is labelled semantic completion.

### Settings, errors, and security

- [ ] Java enablement and completion settings persist and take effect without corrupting Python settings.
- [ ] Optional tooling-JDK, project-JDK, and server paths are trimmed, validated, and never interpreted as shell text.
- [ ] Missing JDK, old JDK, missing server, invalid archive, missing platform config, unwritable cache, timeout, and unexpected exit map to stable messages.
- [ ] Public errors omit source text, credentials, environment values, raw package output, and unnecessary private paths.
- [ ] Java Intelligence failure never blocks DSH startup, renderer mounting, typing, drafts, manual save, auto-save, or conflict handling.
- [ ] JDT LS acquisition and Maven import honor DSH consent, trust, and permission boundaries.
- [ ] Logs and stderr collection are bounded.

### Regression

- [ ] Existing Java CodeMirror syntax highlighting and generic editing remain unchanged when intelligence is disabled.
- [ ] Python startup, Ready state, semantic completion, cross-file behavior, and environment discovery pass.
- [ ] Python Google Style Docstrings, callable completion, indentation, cancellation, recovery, and cleanup pass.
- [ ] Non-Java and non-Python files never start a semantic provider.
- [ ] Brackets, folding, Tab/Shift+Tab, Undo, drafts, saving, auto-save, and conflict protection pass.
- [ ] `npm run check` passes type checking, all tests, production build, and artifact verification.

## Test Workspaces

```text
tests/fixtures/languages/java/
├── standalone/
│   └── Main.java
├── multi-file/
│   └── src/
│       ├── Main.java
│       └── UserService.java
└── maven-example/
    ├── pom.xml
    └── src/main/java/org/example/
        ├── Main.java
        └── UserService.java
```

Fixtures must be minimal, deterministic, and free of credentials. Network-dependent Maven evidence is separated from offline unit tests and uses a pinned dependency.

## Native DSH Desktop Acceptance

### macOS

- [ ] Record DSH, macOS, architecture, JDK, JDT LS, distribution route, and checksum.
- [ ] Cold-start DSH, open a standalone Java file, and reach truthful `Java: Ready`.
- [ ] Verify standard-library, import, cross-file, unsaved-content, and Maven dependency completion.
- [ ] Test explicit tooling JDK, `JAVA_HOME`, and GUI PATH discovery.
- [ ] Open workspaces with spaces and non-ASCII characters.
- [ ] Switch files and workspaces rapidly without stale completion or data-directory reuse.
- [ ] Exercise missing JDK, JDK below minimum, missing server, broken archive, offline acquisition, unwritable cache, initialization timeout, and server exit.
- [ ] Confirm ordinary editing and saving continue through every failure.
- [ ] Close all Java tabs, disable the feature, unload the plugin, and quit DSH; confirm no owned JVM remains.

### Windows

- [ ] Record DSH, Windows, architecture, JDK, JDT LS, distribution route, and checksum.
- [ ] Cold-start DSH, open a standalone Java file, and reach truthful `Java: Ready`.
- [ ] Verify standard-library, import, cross-file, unsaved-content, and Maven dependency completion.
- [ ] Test explicit tooling JDK, `JAVA_HOME\\bin\\java.exe`, and GUI PATH discovery.
- [ ] Open drive-letter workspaces and paths with spaces and non-ASCII characters.
- [ ] Verify `config_win`, file URIs, argv quoting, cache isolation, and process termination.
- [ ] Switch files and workspaces rapidly without stale completion or data-directory reuse.
- [ ] Exercise missing JDK, JDK below minimum, missing server, broken archive, offline acquisition, unwritable cache, initialization timeout, and server exit.
- [ ] Confirm ordinary editing and saving continue through every failure.
- [ ] Close all Java tabs, disable the feature, unload the plugin, exit the tray process, and confirm no owned JVM remains.

## Performance and Resource Evidence

- [ ] Record cold and warm startup-to-Ready time for standalone and Maven workspaces on both platforms.
- [ ] Record steady-state JVM memory for representative workspaces and document the measurement method.
- [ ] Rapid edits do not create unbounded completion requests, JVMs, timers, or cache directories.
- [ ] Indexing remains asynchronous and editor input/save latency stays acceptable.
- [ ] Reopening the same workspace reuses only valid cache state and recovers safely from corrupt state.

## Packaging and Documentation

- [ ] The selected JDT LS delivery route, license notices, checksums, package contents, cache behavior, and cleanup instructions are documented.
- [ ] `npm pack --dry-run --json --ignore-scripts` contains only intended runtime assets and no imported root design file.
- [ ] README files explain Java requirements, server versus project JDKs, setup, status, limitations, and macOS/Windows support.
- [ ] The changelog describes only delivered P0 behavior; deferred Hover, diagnostics, navigation, Gradle, and frameworks are not claimed.
- [ ] `package.json`, lockfile, changelog, tag, and GitHub Release use `0.3.0` / `v0.3.0` consistently.
- [ ] Documentation links and `git diff --check` pass.

## Release Gate

Do not release v0.3.0 if the JDT LS source or distribution route is unresolved; either native platform lacks a real Ready state; Maven or cross-file completion is simulated; Java can leak a process or writable workspace state; an older request can reach a new tab, revision, workspace, or provider; Java failure affects editing or saving; Python regresses; licensing or integrity evidence is incomplete; or any applicable P0, native, packaging, or documentation item remains unchecked.
