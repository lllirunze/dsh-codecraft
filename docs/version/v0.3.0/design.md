# DSH CodeCraft v0.3.0 Design

## Java Lightweight Language Support

| Field | Value |
| --- | --- |
| Target version | 0.3.0 |
| Baseline | 0.2.2 |
| Status | Implemented and validated; release prepared |
| Platforms | Current DSH Desktop platforms |
| Runtime model | Browser-local, offline, no Java process |

## Purpose

v0.3.0 adds useful Java editing assistance without turning CodeCraft into a Java IDE. A `.java` file receives syntax highlighting, bracket and indentation behavior, local completion, snippets, folding, comments, and deterministic Structured Javadoc generation immediately after the plugin is installed.

This design replaces the earlier JDT LS approach. The release does not bundle or download JDT LS, a JRE, or a JDK; it does not start a Java subprocess, scan a project, resolve dependencies, or contact a remote service. Java support remains available offline and has the same macOS and Windows behavior because it runs entirely inside the existing CodeMirror editor.

## Scope

### Required capabilities

| ID | Capability | Delivery |
| --- | --- | --- |
| JAVA-001 | Recognize `.java` files | Existing language registry, with plain-text fallback on initialization failure |
| JAVA-002 | Java syntax highlighting | `@codemirror/lang-java` Lezer parser and CodeCraft theme |
| JAVA-003 | Bracket and quote pairing | Shared CodeMirror pairing for `()`, `{}`, `[]`, `""`, and `''`; no automatic `< >` pair |
| JAVA-004 | Indentation | Shared Enter, Tab, Shift+Tab, delimiter expansion, and Java parser indentation |
| JAVA-005 | Keyword completion | Local, prefix-filtered Java keyword data |
| JAVA-006 | Common type completion | Static standard-library type names without import insertion or type claims |
| JAVA-007 | Snippets | Main method, output, declarations, control flow, loops, and exception handling |
| JAVA-008 | Comments | Shared `Mod-/` line-comment behavior plus parser support for block comments and Javadoc |
| JAVA-009 | Folding | CodeMirror syntax-tree folding for declarations, blocks, and multiline comments |
| JAVA-011 | Current-document words | Bounded local identifier extraction and prefix completion |
| JAVA-012 | Structured Javadoc | Adjacent-declaration parsing with safe fallback |

JAVA-010, a separate current-file outline, remains conditional. CodeCraft has no file-outline surface in this release, so v0.3.0 does not add an unused symbol UI or a second parser. The Java syntax tree still supplies declaration-aware highlighting and folding.

## Architecture

```text
Open .java file
  -> language registry
  -> CodeMirror Java parser
  -> Java browser module
       -> static keywords and common types
       -> snippet definitions
       -> bounded current-document words
       -> Structured Javadoc parser
  -> shared completion, folding, bracket, comment, and indentation UI
```

The implementation is browser-only:

```text
src/client/languages/java/
├── index.ts
└── features/
    ├── completion.ts
    ├── snippets.ts
    └── javadoc.ts
```

`src/client/languages/java/index.ts` is the only registration point. Static candidate data, snippet templates, and Javadoc parsing remain separate so future Java features do not become one monolithic provider. The Host protocol, settings schema, subprocess manager, and Python language server contain no Java branch.

## Completion Model

The Java completion source merges four local candidate groups:

1. Java keywords;
2. common Java types;
3. Java snippets;
4. identifiers already present in the current document.

Candidates are presented through CodeCraft's existing completion UI. Static groups carry distinct completion kinds and ranking. Document words require a two-character prefix, are deduplicated, and are capped at 100 results. Files larger than 200,000 characters skip document-word extraction while retaining static candidates. Completion is suppressed in comments, string literals, character literals, and incomplete quoted input.

This is lexical input assistance, not semantic completion. It does not infer a receiver type, validate imports, insert imports, inspect another file, or claim that a candidate compiles.

## Snippets

The module provides `psvm`, `sout`, `soutv`, `class`, `interface`, `enum`, `record`, `constructor`, `method`, `if`, `ifelse`, `for`, `foreach`, `while`, `switch`, `trycatch`, and `tryfinally`. Templates use CodeMirror snippet fields so repeated names stay linked where applicable and Tab can advance through editable positions. Templates follow the active editor indentation unit and remain a single undoable edit.

`javadoc` is a specialized completion rather than a static template. It runs the same adjacent-declaration parser used by the `/**` + Enter action.

## Structured Javadoc

Generation is allowed only when `/**` occupies the declaration-adjacent line or when the user accepts the `javadoc` completion. The lightweight parser supports common annotations, multiline signatures, generic and nested generic types, arrays, varargs, constructors, generic types and methods, and explicit `throws` clauses.

The output rules are deterministic:

- the first line is the declaration name, never a guessed description;
- type parameters precede ordinary `@param` tags;
- parameter names and declared type text retain source order;
- non-`void` methods receive the declared return type;
- constructors and `void` methods receive no `@return`;
- only explicitly declared exceptions receive `@throws`;
- an uncertain or incomplete declaration receives an editable basic template.

Generation never changes the declaration or method body and is submitted as one undoable editor transaction. Normal Enter behavior continues when the trigger context is not conclusive.

## Reliability and Compatibility

- Java initialization failure must fall back to ordinary text editing and saving.
- No Java feature reads files other than the active document.
- No Java feature performs network access, filesystem discovery, or subprocess execution.
- Java-specific extensions load only for `.java` files and cannot affect Python behavior.
- Incomplete Java remains editable; parser errors do not block completion or input.
- Current-document scanning is bounded, and all other candidate sets are static.
- Shared draft recovery, conflict-safe saving, newline preservation, undo/redo, and read-only behavior remain unchanged.

## Explicitly Out of Scope

- JDT LS or another Java language server;
- bundled JDK/JRE assets or runtime downloads;
- compiling, running, testing, debugging, or formatting Java;
- semantic member, import, cross-file, Maven, or Gradle completion;
- dependency resolution, diagnostics, hover, signature help, navigation, references, or code actions;
- Spring, Android, Jakarta, or other framework intelligence;
- automatic import insertion or project Java-version selection.

## Definition of Done

v0.3.0 is ready when automated tests cover language registration, local completion isolation, snippet availability, Structured Javadoc parsing and fallback, and Python regressions; the production bundle contains no JDT LS/runtime package or Java Host provider; `npm run check` passes; and native DSH Desktop validation confirms Java highlighting, input behavior, snippets, folding, comments, saving, and Javadoc generation on macOS and Windows without a JDK or network connection.
