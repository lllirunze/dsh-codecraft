# DSH CodeCraft v0.3.3 Validation

| Field | Value |
| --- | --- |
| Target version | 0.3.3 |
| Baseline | 0.3.2 |
| Status | Planned; no implementation evidence recorded |
| Design | [design.md](design.md) |

## Evidence Rules

- Leave every item unchecked until the named behavior has been observed in the implementation or DSH Desktop.
- Test the effective Java behavior, not only the switch appearance or serialized configuration.
- A rejected settings write must not be recorded as a successful toggle.
- Disabling Java assistance must leave common editing and saving operational.
- Native acceptance is required independently on macOS and Windows.

## Automated Validation

- [ ] Missing, malformed, and partial configuration values resolve `javaEditingAssistance.enabled` to `true`.
- [ ] Explicit `true` and `false` values survive full CodeCraft settings resolution.
- [ ] The Host schema declares the Java group and defaults its only field to `true`.
- [ ] The settings store reads the accepted Java snapshot and writes only `['javaEditingAssistance', 'enabled']`.
- [ ] A successful mutation updates the displayed and effective value.
- [ ] A rejected or throwing mutation restores the accepted value and exposes the settings error state.
- [ ] The Java switch is disabled while configuration is loading, read-only, or saving.
- [ ] The settings UI contains exactly one Java assistance switch with the required English and Chinese localized text.
- [ ] A Java editor created while enabled installs the existing v0.3.0 Java language and editor extensions.
- [ ] A Java editor created while disabled omits Java-specific extensions but retains common editor extensions.
- [ ] Toggling off reconfigures an already open Java editor without changing its document, selection, scroll position, history, dirty state, or save state.
- [ ] Toggling on restores existing Java completion, snippets, Structured Javadoc, highlighting, comments, and folding without recreating the editor.
- [ ] Multiple open Java editors converge on the latest accepted value, including repeated rapid changes.
- [ ] New Java tabs use the latest accepted value after an earlier toggle.
- [ ] Java reconfiguration does not change Python Intelligence settings, lifecycle, completion, Hover, or navigation.
- [ ] Non-Java language behavior, manual save, AutoSave, drafts, conflicts, indentation, brackets, Undo/Redo, and tab switching regressions remain green.
- [ ] Java extension initialization or reconfiguration failure falls back to editable, saveable text.
- [ ] Settings and editor subscriptions are disposed without duplicate listeners or extension accumulation.
- [ ] The package adds no Java Host provider, JDT LS, JDK/JRE artifact, downloader, subprocess, or network dependency.
- [ ] `npm run check` and `git diff --check` pass.

## macOS Desktop Acceptance

- [ ] Open **Settings → CodeCraft** and confirm exactly one Java Editing Assistance switch is visible and initially on for an old profile with no Java setting.
- [ ] Open existing and new `.java` tabs while on; confirm the v0.3.0 local Java feature set remains available.
- [ ] Turn the switch off; confirm all already open and subsequently opened Java tabs stop providing Java-specific assistance immediately.
- [ ] While off, edit, select, Undo, Redo, manually save, AutoSave, switch tabs, and reopen Java files without data loss.
- [ ] Turn the switch on and confirm existing Java tabs regain the v0.3.0 feature set without reopening or restarting DSH.
- [ ] Restart DSH once with the setting off and once with it on; confirm the UI and runtime behavior both retain the accepted value.
- [ ] Toggle repeatedly and confirm the final UI, stored value, and behavior agree.
- [ ] Force or simulate a rejected settings write; confirm visible failure and restoration of the previous accepted state.
- [ ] Keep Java and Python tabs open while toggling Java; confirm Pyright state and Python behavior do not change.
- [ ] Confirm Java remains offline and starts no Java process.

## Windows Desktop Acceptance

- [ ] Repeat the complete macOS settings, open-tab, new-tab, persistence, failure, editing, and isolation matrix on Windows.
- [ ] Confirm CRLF Java files retain their newline style through off/on changes and saving.
- [ ] Confirm Windows paths, multiple tabs, and rapid toggles do not create duplicate behavior or lose edits.
- [ ] Confirm Task Manager shows no CodeCraft-started Java process and all Java assistance remains offline.

## Packaging and Documentation

- [ ] The packed plugin contains the settings and Java compartment changes but no Java runtime or language-server asset.
- [ ] README files describe the Java switch only after implementation and validation are complete.
- [ ] Changelog, package version, lockfile version, tag, and release metadata remain unchanged until the release gate passes.
- [ ] Final release notes describe a settings control, not new Java language capabilities.

## Release Gate

Do not release v0.3.3 while any mandatory item is incomplete; the switch is missing, duplicated, or defaults off; UI and runtime state can diverge; accepted changes fail to affect open and future Java tabs; rejected writes alter effective behavior; disabling Java breaks editing, saving, drafts, or shared editor features; Java toggles affect Python or another language; Java runtime or network dependencies are introduced; or macOS or Windows native acceptance is missing.
