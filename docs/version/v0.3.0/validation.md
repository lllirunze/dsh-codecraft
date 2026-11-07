# DSH CodeCraft v0.3.0 Validation

| Field | Value |
| --- | --- |
| Target version | 0.3.0 |
| Baseline | 0.2.2 |
| Status | Automated checks passed; Desktop acceptance pending |
| Design | [design.md](design.md) |

## Evidence Rules

- Keep native items unchecked until they pass in DSH Desktop on the named platform.
- Test Java with no JDK requirement and with networking disabled.
- A lexical candidate must not be described as semantic or project-aware completion.
- Any Java failure must leave opening, editing, drafts, and conflict-safe saving operational.

## Automated Validation

- [x] `.java` resolves to the dedicated Java adapter and other language mappings remain unchanged.
- [x] `@codemirror/lang-java` parses complete and incomplete Java without throwing.
- [x] shared bracket pairing covers parentheses, braces, brackets, strings, and characters but not angle brackets.
- [x] shared indentation handles nested braces, delimiter expansion, Tab, Shift+Tab, and multiline selections.
- [x] `Mod-/` toggles Java line comments and parser folding exposes valid Java blocks.
- [x] keyword completion includes representative candidates such as `public` and `static`.
- [x] common-type completion includes `String`, collections, `Optional`, dates, exceptions, and numeric types.
- [x] snippets include `psvm`, output, type declarations, methods, loops, branches, switch, and exception handling.
- [x] snippet placeholders remain editable and one Undo removes the insertion.
- [x] current-file identifiers are deduplicated, prefix-filtered, bounded, and skipped for oversized documents.
- [x] completion is suppressed in comments, strings, characters, and incomplete quoted input.
- [x] Java completion performs no Host request, network request, project scan, or subprocess launch.
- [x] Structured Javadoc covers ordinary methods, `void`, constructors, generic methods and types, nested generics, arrays, varargs, multiple parameters, multiple `throws`, annotations, and multiline declarations.
- [x] Structured Javadoc preserves source order and declared type text without inventing descriptions.
- [x] incomplete declarations fall back safely and existing source is not overwritten.
- [x] Java settings, runtime-selection routes, JDT LS providers, runtime packages, and download scripts are absent.
- [x] Python completion, indentation, Docstrings, callable insertion, lifecycle, and settings tests remain green.
- [x] `npm run check`, package verification, audit, and `git diff --check` pass (15 files, 164 tests at implementation time).

## macOS Desktop Acceptance

- [ ] Build and link the source plugin, fully quit DSH Desktop, and cold start it.
- [ ] Open an empty `.java` file and a representative class without installing or configuring a JDK.
- [ ] Confirm Java highlighting, brackets, quotes, nested indentation, comments, folding, Undo, Redo, and saving.
- [ ] Confirm `pub`, `Arr`, `psvm`, `sout`, `foreach`, and a current-file identifier produce the expected local candidates.
- [ ] Confirm completion does not appear inside comments and quoted text.
- [ ] Type `/**` above a method and press Enter; verify name, parameter types, return type, and declared exceptions.
- [ ] Verify constructor, `void`, generic, array, varargs, annotation, multiline, and incomplete-declaration Javadoc cases.
- [ ] Disable networking and repeat opening, completion, snippets, and Javadoc.
- [ ] Confirm no Java process starts and no runtime archive or cache directory is created.
- [ ] Regress Python Intelligence and ordinary non-Java editing.

## Windows Desktop Acceptance

- [ ] Install the same source revision and cold start DSH Desktop.
- [ ] Repeat the macOS functional matrix without installing or configuring a JDK.
- [ ] Verify CRLF preservation, Windows paths, save shortcuts, comments, folding, snippets, and Javadoc.
- [ ] Disable networking and confirm all Java features remain available.
- [ ] Confirm Task Manager shows no CodeCraft-started Java process.
- [ ] Regress Python Intelligence and ordinary non-Java editing.

## Packaging and Documentation

- [x] `npm pack --dry-run` contains the Java client module and no JDT LS, JRE, runtime-package manifest, or imported root requirements document.
- [x] package size remains consistent with a lightweight client feature (438,664-byte archive at implementation time).
- [x] docs describe Java support as local lexical assistance and list semantic/project features as out of scope.
- [ ] README and changelog are updated only when v0.3.0 is prepared for release.
- [ ] package version, lockfile, changelog, tag, and GitHub Release are aligned only after native acceptance.

## Release Gate

Do not release v0.3.0 if any Java action requires a JDK or network connection; a Java Host provider, runtime package, or downloader remains; Structured Javadoc can overwrite declarations or invent type information; completion leaks into comments or strings; Java behavior affects Python; ordinary editing or saving degrades; or applicable automated, packaging, macOS, or Windows checks remain incomplete.
