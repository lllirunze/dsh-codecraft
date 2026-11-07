# External Language Tools

| Field | Value |
| --- | --- |
| Status | Long-term architectural direction; not a release commitment |
| Scope | Optional language servers, compilers, SDKs, and large toolchains |
| Principles | Local-first, explicit, mirror-aware, verifiable, recoverable |

## Purpose

CodeCraft should provide useful editing without requiring a network download or a separately installed toolchain whenever a lightweight implementation can meet the core need. The v0.3.0 Java work is the reference decision: browser-local Java assistance replaced the attempted JDT LS distribution because download reliability, package size, runtime requirements, and maintenance cost outweighed the intended release value.

Some future semantic features may still justify an external language service. This guide defines the product and engineering constraints that must be evaluated before such a dependency enters a version design. It does not add JDT LS to Java, create an installation feature, or commit any future release to an external tool.

## Decision Gate

Before selecting an external component, a version proposal must answer all of the following:

1. Which user-visible capability cannot be delivered adequately by the built-in approach?
2. Is the component's official package, version metadata, checksum or signature, and license reliably available?
3. Can users in different network environments choose a verified official source, a reviewed mirror, or a local offline package?
4. Can macOS and Windows run the component inside the real DSH Desktop Host environment?
5. Can download, verification, installation, startup, update, and removal fail without affecting basic editing or DSH startup?
6. Is the compatibility and maintenance burden sustainable for the project?

If these questions do not have verified answers, reduce the feature scope or retain a manual integration. Do not place an unproven distribution promise in a version design.

## Product Rules

- Keep baseline editing local and immediately available after plugin installation.
- Never start a large download merely because a user opened a file.
- Present optional components in a dedicated settings area only when a delivered module actually uses them.
- Before installation, show the component, version, approximate size, source, license information, and runtime requirements.
- Let the user explicitly select a reviewed mirror, the official international source, or a local package. Do not force a source from IP or locale detection.
- Treat installation and runtime readiness as separate states. A valid server archive may still lack a compatible runtime.
- Allow explicit install, update, reinstall, version change, and removal actions. Do not modify system runtimes, global `PATH`, or DSH Desktop itself.
- Keep the previous verified version available until the replacement passes validation.

A package registry mirror is not automatically a valid mirror for every component. Each source must be evaluated for the component, version, platform, architecture, archive format, provenance, and redistribution terms it actually serves.

## Component and Compatibility Model

Each integration should have reviewed metadata equivalent to:

```text
component identity and version
supported platforms and architectures
compatible CodeCraft version range
official and reviewed mirror artifacts
archive format and launcher rules
checksum or signature metadata
language-service runtime requirement
project-language compatibility
```

Keep these versions distinct:

- the CodeCraft plugin version;
- the external component version;
- the runtime used to launch that component;
- the language version used by the user's project.

For example, a project targeting Java 8 may use a newer JDK to launch a language server. The exact relationship must come from the selected component's verified documentation, not an assumed matching version number.

## Sources and Supply-Chain Safety

A faster mirror is useful only when its artifact can be trusted. An integration must:

- bind each artifact to the selected component and exact version;
- verify a publisher-provided checksum or signature when available;
- document the reviewed relationship between a mirror and its upstream source;
- use HTTPS, bounded redirects, timeouts, and size limits;
- reject archive path traversal, unsafe symbolic links, and writes outside the dedicated component directory;
- avoid executing or activating content before verification completes;
- support clear retry, source switching, and local-package recovery;
- review download and redistribution licenses separately.

Search-engine download links and unverified mirrors are not trusted sources. When trustworthy verification metadata is unavailable, CodeCraft should prefer a user-managed manual setup or decline to support managed installation.

## Transactional Lifecycle

Managed components should use isolated, versioned storage in a CodeCraft user-data or cache location:

```text
Not Installed
  -> Downloading
  -> Verifying
  -> Installing
  -> Installed
  -> Runtime Ready
```

Download and extract into a temporary directory. Validate identity, integrity, archive safety, required files, permissions, and runtime compatibility before atomically selecting the new version. An interrupted or failed candidate must not replace the active version. Removal must first stop the owned process and must never delete project files, system runtimes, or unrelated caches.

Download failure, verification failure, installation failure, and runtime failure are distinct states with separate recovery guidance. None may prevent DSH Desktop from starting or disable CodeCraft's ordinary editing and saving.

## Runtime and Platform Boundaries

The browser bundle may present status and user actions, but it must not download archives, inspect the filesystem, or launch a process. Host-side services own network transfer, verification, storage, runtime discovery, process supervision, and cleanup through supported DSH APIs.

Use `darwin` for macOS and `win32` for Windows; architecture is an independent artifact-selection dimension. Native validation must cover Apple Silicon and Intel only when separate packages or behavior require it. Windows validation must include drive letters, file locking, permissions, spaces and non-ASCII paths, antivirus interaction, and process termination. macOS validation must include executable permissions, GUI-process environments, signing or quarantine behavior, and architecture compatibility.

Extracting an archive is not platform acceptance. The component must start, initialize, serve a real workspace, stop, recover, and uninstall inside DSH Desktop on every claimed platform.

## Architecture Ownership

External dependency management is shared Host infrastructure, not a Java-specific subsystem. A future manager may own source resolution, download, verification, versioned storage, rollback, and runtime detection. A language, framework, or ecosystem module owns only its component declaration, launch rules, and semantic capabilities.

This boundary follows the [intelligence module conventions](intelligence-module-conventions.md):

- modules without external dependencies do not participate;
- a framework reuses its parent language service instead of installing a duplicate server;
- shared infrastructure must not import a concrete language implementation;
- all processes, requests, temporary files, and listeners follow workspace, plugin, and application lifecycle ownership;
- directories, classes, settings, and manifests are created only for implemented behavior, not for this concept alone.

## Version-Design Requirements

When a release adopts an external component, its design and validation documents must name:

- the exact user value and why the lightweight option is insufficient;
- supported component, runtime, platform, and architecture combinations;
- reviewed sources, integrity authority, archive rules, and licenses;
- UI states and every failure/recovery path;
- storage, update, rollback, removal, and orphan-cleanup behavior;
- native macOS and Windows acceptance scenarios;
- failure-isolation tests proving that editing, saving, other languages, and DSH startup remain usable.

Release documentation must distinguish a planned candidate from delivered behavior. This guide alone authorizes no download, installation, setting, directory scaffold, or release claim.

## Prohibited Patterns

- silent installation when a file opens;
- selecting an unverified mirror only because it is faster;
- downloading executable content in the browser renderer;
- extracting directly over the active version;
- treating download completion as runtime readiness;
- modifying system JDKs, SDKs, environment variables, or DSH files;
- coupling shared distribution code to one language;
- making DSH startup depend on an optional component;
- promising managed installation before native platform and recovery validation.

## Summary

Baseline language support should remain built in. Complex external tools may be offered only as explicit, optional, verifiable installations with reviewed international, mirror, and offline sources; transactional activation and rollback; strict Host-side lifecycle ownership; and failure isolation that preserves DSH Desktop and ordinary editing.
