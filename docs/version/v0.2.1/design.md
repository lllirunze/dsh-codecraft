# DSH CodeCraft v0.2.1 Python Intelligence Improvements

| Field | Value |
| --- | --- |
| Status | Implemented; automated validation passed, Desktop acceptance pending |
| Target version | 0.2.1 |
| Baseline | 0.2.1-rc.0 Windows compatibility preview |
| Release type | Patch |
| Release theme | Python indentation, editing refinements, and module conventions |
| Platform scope | Python Intelligence and editor: macOS and Windows |

## Purpose

v0.2.1 refines the Python experience introduced in v0.2.0 and preserves the Windows enablement validated by [v0.2.1-rc.0](../v0.2.1-rc.0/design.md). It is not a second LSP implementation and does not add another language. The release must fix Python-aware indentation, preserve the stable editor and semantic-completion behavior on macOS and Windows, and establish one maintainable convention for future language, framework, and ecosystem modules.

The release has two required outcomes:

1. Python Enter behavior understands block headers, branches, and multiline expressions without treating every colon as a block.
2. [`intelligence-module-conventions.md`](../../guide/intelligence-module-conventions.md) becomes the single source of truth for intelligence-module layout and dependencies.

Triple-quote behavior and Google Style Docstring generation are optional enhancements. Completion, environment, or LSP lifecycle changes are permitted only for reproduced defects with regression tests.

## Existing Implementation Findings

The repository already provides the foundations required by this release:

- `@codemirror/lang-python` is installed and `python()` is attached to Python editor states through `src/client/languages/index.ts`.
- `src/client/editor/extensions/indentation.ts` installs a high-priority Enter command. It handles inherited whitespace and generic delimiters, but it does not ask the Python syntax service for indentation. This command can therefore mask CodeMirror's language-aware newline behavior.
- `src/client/editor/extensions/brackets.ts` already declares Python triple quotes alongside ordinary quote pairs. v0.2.1 must test and refine this integration rather than introduce a keystroke-counting state machine.
- `src/host/intelligence/`, `src/host/lsp/`, and `src/host/languages/python/` already own semantic coordination, protocol handling, Pyright, and interpreter discovery. These areas must not be copied into the browser language module.
- Tests are intentionally flat under `tests/`; v0.2.1 keeps that repository convention instead of adding source-local `__tests__` directories.

## Scope and Priorities

### P0: release requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| PY-IND-01 | Python block indentation | Enter after a valid `def`, `class`, `if`, loop, `try`, or `with` header adds one configured indent unit |
| PY-IND-02 | Branch alignment | `elif`, `else`, `except`, `finally`, and `case` align safely when syntax context is conclusive |
| PY-IND-03 | Multiline expressions | Parenthesized expressions and container literals receive reasonable continuation and closing-delimiter alignment |
| PY-IND-04 | Context safety | Dictionary, slice, annotation, string, comment, lambda, and URL colons do not trigger block indentation |
| PY-IND-05 | Shared settings | New indentation remains space-only and respects the existing 2- or 4-space setting |
| PY-ARCH-01 | Python module boundary | Python-specific client behavior is isolated without moving shared editor or Host LSP code into it |
| PY-ARCH-02 | Module convention | The independent module-convention document is delivered and referenced |
| PY-REG-01 | Regression safety | Save, auto-save, drafts, conflicts, brackets, semantic completion, native tabs, and non-Python editing do not regress |

### P1: evidence-gated enhancements

- Verify ordinary quotes and `'''`/`"""` pairing, caret placement, Enter behavior, raw strings, and f-strings; change code only where a failure is reproduced.
- Add a Google Style Docstring template only if safe syntax detection, a stable trigger, placeholder editing, and one-step Undo can be delivered without guessing program meaning.
- Fix import, member, cross-file, environment, restart, or stale-result behavior only when a failing case is reproduced first.
- Ensure any generated Python identifiers follow PEP 8. Do not lint or rename existing user identifiers.

### Out of scope

- new semantic languages or framework providers;
- AI-generated code or AI-generated documentation;
- whole-file formatting or automatic migration of historical tabs and indentation;
- a custom Python parser or replacement for Pyright;
- a general code-quality subsystem;
- speculative framework or ecosystem implementations;
- Linux support for Python Intelligence; Windows support is a prerequisite delivered through v0.2.1-rc.0, not part of the indentation implementation.

## Python Indentation Design

### Responsibility boundary

The shared indentation extension continues to own the configured indent unit, space-only Tab and Shift+Tab behavior, selection preservation, and language-neutral delimiter expansion. Python owns only syntax-dependent decisions.

The implementation must not add `language === 'python'` branches to the shared indentation module. The Python editor adapter should contribute a Python-specific extension through the language registry. That extension may delegate to shared helpers, but shared modules must not import Python code.

### Enter decision order

For a Python document, one Enter transaction should use this order:

1. preserve the current generic empty-delimiter expansion when the caret is between a matching pair;
2. request indentation from the mounted CodeMirror Python language service and syntax tree;
3. apply the configured 2- or 4-space `indentUnit` to the returned structure;
4. use the existing inherited-whitespace behavior only when syntax information is unavailable or incomplete.

The implementation should first determine whether CodeMirror's standard newline-and-indent command is sufficient once the high-priority generic Enter binding stops masking it. A custom Python command is justified only for verified gaps.

### Required behavior

With a two-space setting:

```python
def calculate():
  pass

if enabled:
  run()
else:
  stop()

values = [
  first,
  second,
]
```

The same structures must use four spaces when configured. Opening or saving an existing file must never normalize unrelated whitespace.

Branch alignment should occur only at a stable syntax event, such as newline indentation or CodeMirror's supported input-indentation hook. The editor must not move text while a user is merely typing the first letters of `else` or `except`. When the parser cannot identify the matching structure, preserve the user's input.

These colons must remain ordinary expression or text syntax:

```python
person = {"name": "Alice"}
segment = values[1:5]
name: str = "Alice"
message = "https://example.com"
# note: not a block header
```

Tests must also cover nested containers, comments, multiline strings, f-strings, raw strings, lambdas, and incomplete code that is common during editing.

## Triple Quotes and Docstrings

### Triple-quote refinement

The current close-bracket configuration is the starting point. Tests must verify that consecutive quote input does not create surplus quotes, that the caret remains inside a pair, and that Enter inside a multiline string does not trigger block indentation. The implementation should rely on CodeMirror language data and close-bracket behavior wherever possible.

### Optional Docstring generator

If delivered, generated documentation uses triple double quotes and Google Style only. Natural generation is allowed only after the user types `"""` and presses Enter in the first statement position of a function, method, or class that has no Docstring. An explicit **Generate Docstring** command may be added only through a stable public DSH command surface.

The syntax tree must establish the insertion target. No generation occurs in comments, arbitrary strings, existing Docstrings, or ambiguous syntax. A function template may include:

- an editable summary placeholder;
- `Args` in signature order, omitting `self` and reliably identified `cls`;
- `Returns` for a reliably non-`None` return annotation;
- `Yields` for a reliably identified generator.

It must not invent behavior, exceptions, types, or descriptions. Empty sections are omitted. The insertion respects the configured indent width and is one undoable transaction. If these guarantees are not met, Docstring generation remains out of v0.2.1 and release notes must say so.

## Module Architecture

The detailed rules live in [`intelligence-module-conventions.md`](../../guide/intelligence-module-conventions.md). v0.2.1 applies them with a minimal migration.

```text
Shared editor and intelligence contracts
├── client language presentation
│   └── Python editor features: syntax, indentation, strings, optional Docstrings
└── Host semantic intelligence
    └── Python services: Pyright and environment selection
        ├── future Python framework enhancement
        └── future Python ecosystem enhancement
```

This is a capability relationship, not a requirement for deep TypeScript inheritance. Registries, interfaces, delegation, and composition are preferred where they keep browser and Host bundles separate.

The likely client extraction is:

```text
src/client/languages/
├── EditorLanguageAdapter.ts
├── index.ts
├── registry.ts
└── python/
    ├── index.ts
    └── features/
        ├── indentation.ts
        ├── strings.ts             # only if refinement is required
        └── docstrings.ts          # only if the P1 feature ships
```

Existing Host files remain under `src/host/languages/python/`. Shared LSP framing and sessions remain under `src/host/lsp/`, and the coordinator remains under `src/host/intelligence/`. No empty Java, C++, PyTorch, FastAPI, or Kubernetes directory is created.

## Implementation Plan

### Stage A: reproduce and map

1. Add failing tests for block headers, false-positive colons, branches, containers, and 2/4-space settings.
2. Confirm the exact interaction between the high-priority Enter binding, Python language support, `indentUnit`, and `indentOnInput`.
3. Record which v0.2.0 semantic scenarios already pass; do not redesign them.

### Stage B: fix P0 indentation

1. Expose language-specific editor extensions through the client adapter or an equivalent registry contract.
2. Let Python use syntax-aware indentation while retaining generic delimiter expansion and boundary-based Tab commands.
3. Add Python isolation and non-Python regression tests.

### Stage C: evaluate P1 work

1. Test triple quotes before modifying their behavior.
2. Prototype the Docstring trigger only if syntax and transaction guarantees are practical.
3. Reproduce any semantic or environment defect before changing Host code.

### Stage D: validate and release

1. Run `npm run check` and `npm pack --dry-run --json`.
2. Record automated evidence and macOS and Windows Desktop acceptance in `docs/version/v0.2.1/validation.md`.
3. Verify native tabs, save flows, plugin coexistence, semantic completion, and Pyright teardown.
4. Update README, changelog, package versions, and release metadata only after the delivered scope is known.

## Verification Matrix

Automated tests must cover:

- all common Python block headers at both indent widths;
- nested blocks and incomplete syntax;
- branch alignment without mid-word cursor jumps;
- multiline parentheses, lists, dictionaries, sets, and calls;
- dictionary, slice, annotation, string, comment, lambda, and URL colons;
- ordinary quotes, triple quotes, raw strings, and f-strings;
- existing Tab, Shift+Tab, delimiter expansion, and aligned closer behavior;
- isolation from Markdown, JavaScript, and other supported languages;
- existing Pyright import, cross-file, unsaved-document, member, environment, restart, and cleanup tests;
- Docstring syntax guards, sections, indentation, placeholders, and one-step Undo if that feature ships.

Manual acceptance on macOS and Windows must verify Enter and branch behavior in a real Python tab, both indent widths, triple quotes, semantic completion, save and auto-save, workspace switching, plugin unload, and absence of a residual Pyright process. Windows acceptance must also repeat the rc.0 cross-file, virtual-environment, path, and lifecycle scenarios.

## Risks and Controls

| Risk | Control |
| --- | --- |
| Generic Enter masks Python indentation | Test extension precedence and delegate to the mounted language service |
| Two handlers insert whitespace | Keep one Enter transaction and define an explicit decision order |
| Colon heuristics produce false positives | Use syntax context; preserve input when uncertain |
| Refactoring crosses browser/Host boundaries | Keep CodeMirror features on the client and Pyright/process work on the Host |
| Patch scope becomes an LSP rewrite | Require a failing reproduction and regression test for every Host change |
| Conventions create empty scaffolding | Create files only for behavior shipped in this release |
| Docstrings invent user intent | Generate placeholders only, or defer the feature |

## Definition of Done

v0.2.1 is ready when all P0 requirements pass automated and macOS and Windows Desktop validation; Python-specific behavior affects only Python documents; 2/4-space settings and shared Tab behavior remain correct; v0.2.0 semantic completion and the rc.0 Windows compatibility contract do not regress; the module convention is published and reflected by the actual Python layout; and unshipped P1 items are excluded from release claims.

