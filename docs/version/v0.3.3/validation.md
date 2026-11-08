# DSH CodeCraft v0.3.3 Validation

| Field | Value |
| --- | --- |
| Target version | 0.3.3 |
| Baseline | 0.3.2 |
| Status | Automated and Desktop acceptance passed; release metadata prepared |
| Design | [design.md](design.md) |

## Evidence Rules

- Leave every item unchecked until the named behavior has been observed in the implementation or DSH Desktop.
- Test the effective Java behavior, not only the switch appearance or serialized configuration.
- A rejected settings write must not be recorded as a successful toggle.
- Disabling Java assistance must leave common editing and saving operational.
- Native acceptance is required independently on macOS and Windows.

## Automated Validation

- [x] Missing, malformed, and partial configuration values resolve `javaEditingAssistance.enabled` to `true`.
- [x] Explicit `true` and `false` values survive full CodeCraft settings resolution.
- [x] The Host schema declares the Java group and defaults its only field to `true`.
- [x] The settings store reads the accepted Java snapshot and writes only `['javaEditingAssistance', 'enabled']`.
- [x] A successful mutation updates the displayed and effective value.
- [x] A rejected or throwing mutation restores the accepted value and exposes the settings error state.
- [x] The Java switch is disabled while configuration is loading, read-only, or saving.
- [x] The settings UI contains exactly one Java assistance switch with the required English and Chinese localized text.
- [x] A Java editor created while enabled installs the existing v0.3.0 Java language and editor extensions.
- [x] A Java editor created while disabled omits Java-specific extensions but retains common editor extensions.
- [x] Toggling off reconfigures an already open Java editor without changing its document or selection; shared editor extensions remain outside the reconfigured compartment.
- [x] Toggling on restores the existing Java language data without recreating the editor.
- [x] Multiple open Java editors converge on the latest accepted value, including repeated rapid changes.
- [x] New Java tabs use the latest accepted value after an earlier toggle.
- [x] Java reconfiguration does not gate Python or another language adapter.
- [x] Non-Java language behavior, manual save, AutoSave, drafts, conflicts, indentation, brackets, Undo/Redo, and tab switching regressions remain green.
- [x] Java extension initialization or reconfiguration failure falls back to editable, saveable text.
- [x] Settings and editor subscriptions are disposed without duplicate listeners or extension accumulation.
- [x] The package adds no Java Host provider, JDT LS, JDK/JRE artifact, downloader, subprocess, or network dependency.
- [x] `npm run check` passes (16 files, 177 tests at implementation time).

## macOS Desktop Acceptance

- [x] Open **Settings → CodeCraft** and confirm exactly one Java Editing Assistance switch is visible and initially on for an old profile with no Java setting.
- [x] Open existing and new `.java` tabs while on; confirm the v0.3.0 local Java feature set remains available.
- [x] Turn the switch off; confirm all already open and subsequently opened Java tabs stop providing Java-specific assistance immediately.
- [x] While off, edit, select, Undo, Redo, manually save, AutoSave, switch tabs, and reopen Java files without data loss.
- [x] Turn the switch on and confirm existing Java tabs regain the v0.3.0 feature set without reopening or restarting DSH.
- [x] Restart DSH once with the setting off and once with it on; confirm the UI and runtime behavior both retain the accepted value.
- [x] Toggle repeatedly and confirm the final UI, stored value, and behavior agree.
- [x] Force or simulate a rejected settings write; confirm visible failure and restoration of the previous accepted state.
- [x] Keep Java and Python tabs open while toggling Java; confirm Pyright state and Python behavior do not change.
- [x] Confirm Java remains offline and starts no Java process.

## Windows Desktop Acceptance

- [x] Repeat the complete macOS settings, open-tab, new-tab, persistence, failure, editing, and isolation matrix on Windows.
- [x] Confirm CRLF Java files retain their newline style through off/on changes and saving.
- [x] Confirm Windows paths, multiple tabs, and rapid toggles do not create duplicate behavior or lose edits.
- [x] Confirm Task Manager shows no CodeCraft-started Java process and all Java assistance remains offline.

## Packaging and Documentation

- [x] The packed plugin contains the settings and Java compartment changes but no Java runtime or language-server asset.
- [x] README files describe the Java switch only after implementation and validation are complete.
- [x] Changelog, package version, lockfile version, tag, and release metadata are aligned to v0.3.3 after the release gate passed.
- [x] Final release notes describe a settings control, not new Java language capabilities.

## Release Gate

Do not release v0.3.3 while any mandatory item is incomplete; the switch is missing, duplicated, or defaults off; UI and runtime state can diverge; accepted changes fail to affect open and future Java tabs; rejected writes alter effective behavior; disabling Java breaks editing, saving, drafts, or shared editor features; Java toggles affect Python or another language; Java runtime or network dependencies are introduced; or macOS or Windows native acceptance is missing.
