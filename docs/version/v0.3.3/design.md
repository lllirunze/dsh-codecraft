# DSH CodeCraft v0.3.3 Java Editing Assistance Settings Design

| Field | Value |
| --- | --- |
| Status | Implemented and validated; release prepared |
| Target version | 0.3.3 |
| Baseline | 0.3.2 |
| Release type | Patch feature release |
| Platforms | macOS and Windows |
| Scope | One persistent, live Java Editing Assistance switch |

## Purpose

v0.3.3 adds one **Java Editing Assistance** switch to the existing native CodeCraft settings page. The switch is enabled by default, persists through the DSH configuration form, and changes every open and future Java editor without requiring a tab reload or Desktop restart.

Disabling the switch removes the browser-local Java assistance delivered in v0.3.0 while retaining ordinary text editing, manual and automatic saving, drafts, conflicts, Undo and Redo, tabs, themes, configured indentation, and shared bracket behavior. The setting is isolated from Python Intelligence and all other languages.

Every requirement in this document is mandatory. The release is not complete if the control changes only its displayed state, affects only newly opened tabs, loses its value after restart, or disables common editor infrastructure.

## Required Scope

| ID | Requirement | Acceptance summary |
| --- | --- | --- |
| JAVA-033-01 | Native setting | Show exactly one Java Editing Assistance switch in the existing CodeCraft settings surface |
| JAVA-033-02 | Default and persistence | Resolve missing or malformed values to `true` and persist accepted changes across restart |
| JAVA-033-03 | Live activation | Apply the accepted value to open and future `.java` editors without restarting DSH |
| JAVA-033-04 | Common editor safety | Keep ordinary editing, saving, drafts, tabs, Undo/Redo, indentation, and shared bracket behavior available while disabled |
| JAVA-033-05 | Language isolation | Do not change Python settings, Python runtime state, or other-language behavior |
| JAVA-033-06 | Reliability | Handle rejected writes and Java extension failures safely on macOS and Windows |

## User Experience

The existing **Settings → CodeCraft** page gains a Java Editing Assistance group containing one Boolean switch:

| Property | Value |
| --- | --- |
| Label | `Java Editing Assistance` |
| Description | `Enable Java language editing assistance.` |
| Default | On |
| Availability | Same native CodeCraft settings card as the existing editor and Python settings |

The control is disabled while the configuration form is loading, read-only, or saving. A successful write updates the effective setting through the form snapshot. A rejected or failed write restores the last accepted value and uses the existing settings error message; the UI must not continue to display an unpersisted value.

No Java sub-switches are added. Completion, snippets, Structured Javadoc, Java parser-driven highlighting, comments, folding, and Java-specific input behavior share the one effective setting.

## Configuration Model

The shared settings model adds one root group parallel to `pythonIntelligence`:

```typescript
export interface JavaEditingAssistanceSettings {
  enabled: boolean
}

export interface CodeCraftSettings {
  editor: EditorSettings
  pythonIntelligence: PythonIntelligenceSettings
  javaEditingAssistance: JavaEditingAssistanceSettings
}
```

The canonical mutation path is `['javaEditingAssistance', 'enabled']`. `DEFAULT_JAVA_EDITING_ASSISTANCE_SETTINGS.enabled` is `true`. The schema resolver accepts only a Boolean and falls back to `true` for a missing group, a missing field, or a malformed value. This preserves v0.3.0 Java behavior for users upgrading from configurations that predate the setting.

`src/config.ts` declares the same default in the Host schema so DSH owns persistence. The browser does not use local storage or a second settings file. `EditorSettingsStore` exposes the resolved Java value in its snapshot and serializes writes through the same `ConfigForm.mutate` path used by current settings.

## Live Editor Design

Java assistance needs an independent CodeMirror `Compartment`. It contains the Java language support and the Java-only extensions currently returned by `javaEditorLanguage`:

```text
Java assistance compartment
├── @codemirror/lang-java language support
├── local Java completion and snippets
└── Structured Javadoc input extension
```

For a Java editor, the compartment is configured with those extensions when the effective setting is enabled and with an empty extension when disabled. Reconfiguration uses a CodeMirror transaction; it does not destroy the `EditorView`, replace the document, reopen the native tab, or alter selection, scroll position, history, draft state, or save state.

Shared editor extensions remain outside this compartment. In particular, line numbers, history, search, read-only enforcement, configured indentation, generic bracket and quote behavior, document updates, themes, and save integration remain installed. Non-Java editors do not need the compartment to react to Java setting changes.

Each open `CodeCraftBody` already subscribes to the shared settings store. A Java body compares the new accepted value with its current effective value and reconfigures its compartment when they differ. A newly created Java editor reads the latest resolved snapshot. This gives open and future tabs the same state without a global editor registry.

## Settings and Runtime Flow

```text
CodeCraft settings switch
  -> EditorSettingsStore.setJavaEditingAssistanceEnabled
  -> ConfigForm.mutate(['javaEditingAssistance', 'enabled'])
  -> accepted DSH configuration snapshot
  -> every open CodeCraftBody subscription
       -> Java tab: reconfigure Java assistance compartment
       -> other tab: no Java action
  -> future Java tabs read the accepted snapshot
```

Writes remain ordered by the existing store's `saving` guard. The runtime follows the accepted form snapshot rather than an optimistic control value, so a rejected write cannot enable or disable assistance. If DSH emits configuration snapshots asynchronously, the latest accepted snapshot is authoritative and stale callbacks must not overwrite it.

## Language and Status Isolation

- The Java setting never writes `pythonIntelligence` fields or restarts, stops, or reconfigures Pyright.
- The Python, HTML, plain-text, and other language adapters keep their existing behavior.
- Java remains browser-local and offline. The setting adds no Host Java provider, subprocess, JDK discovery, JDT LS download, or network request.
- If Java status is presented, disabled assistance must be reported as disabled. Enabling the switch must not claim semantic services or any capability outside v0.3.0.
- Java extension construction or reconfiguration failure must leave the document editable and saveable, with an empty Java assistance compartment as the safe fallback.

## Failure and Lifecycle Behavior

- Missing or malformed configuration resolves to enabled without preventing plugin startup.
- A rejected or throwing configuration mutation leaves the last accepted runtime value active and exposes the existing save-failure state.
- Repeated toggles cannot register duplicate listeners or accumulate Java extensions.
- Tab release disposes the editor, its compartment state, and the normal settings subscription through the existing React lifecycle.
- Plugin or settings-form release resets the shared store safely without modifying documents.
- Java assistance failures never clear text, drafts, configuration, or saved files.

## Explicitly Out of Scope

- new Java completion candidates, snippets, Javadoc behavior, diagnostics, navigation, formatting, or refactoring;
- Java semantic or project-wide intelligence;
- JDK or JRE detection, JDT LS, another language server, downloads, or Java subprocesses;
- separate switches for individual Java features;
- a new settings page, DOM injection, or private DSH settings APIs;
- changes to Python Intelligence or to the common editor and save model.

## Implementation Sequence

1. Add the Java settings type, default, defensive resolver, and Host schema field.
2. Extend the shared settings snapshot and accepted mutation API with the canonical Java path.
3. Add localized Java settings labels and the single native switch.
4. Introduce a Java assistance compartment and make initial editor construction honor the effective setting.
5. Reconfigure open Java editors from accepted settings snapshots while preserving common editor state.
6. Add resolver, store, UI, editor reconfiguration, failure, isolation, and regression tests.
7. Run the full repository checks and complete native macOS and Windows acceptance recorded in [validation.md](validation.md).

## Definition of Done

v0.3.3 is complete only when JAVA-033-01 through JAVA-033-06 pass; the only Java setting defaults to enabled and persists; accepted changes affect open and future Java tabs immediately; rejected changes preserve the prior UI and runtime state; disabling removes the full v0.3.0 Java-specific extension set without damaging common editing or saving; Python and other languages remain isolated; no Java runtime or network dependency is introduced; automated checks pass; and macOS and Windows Desktop acceptance is recorded.
