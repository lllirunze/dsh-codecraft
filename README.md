<div align="center">

# DSH CodeCraft

**A precise, safe CodeMirror 6 editor inside DSH's native file tabs.**

[![npm version](https://img.shields.io/npm/v/dsh-codecraft?logo=npm&label=npm)](https://www.npmjs.com/package/dsh-codecraft)
[![DSH compatibility](https://img.shields.io/badge/DSH-0.2.1--rc.5-5b5bd6)](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-rc.5)
[![CI](https://github.com/lllirunze/dsh-codecraft/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/lllirunze/dsh-codecraft/actions/workflows/ci.yml)
[![platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows-4c8bf5)](#requirements)
[![license](https://img.shields.io/github/license/lllirunze/dsh-codecraft)](LICENSE)

[English](README.md) · [简体中文](README.zh-CN.md) · [Documentation](docs/README.md)

</div>

> **Status:** v0.3.1 adds safe Pyright Hover, definition and reference navigation, and native-tab history for Python on macOS and Windows.

## Features

- Uses DSH's native workspace explorer and file tabs.
- Provides syntax highlighting, line numbers, folding, search, line comments, indentation, undo/redo, and completion.
- Provides project-aware Python completion for imports, cross-file symbols, inferred members, and packages from the selected environment on macOS and Windows.
- Adds call parentheses and places the caret inside for clear Python invocation completions while preserving callback and other callable references.
- Synchronizes unsaved Python content with a workspace-scoped Pyright language server managed through DSH's subprocess service.
- Shows Pyright signatures, types, Docstrings, and source locations when hovering over Python identifiers.
- Navigates from Python uses to definitions with `Command+Click` on macOS or `Ctrl+Click` on Windows, and shows grouped references when invoked on a declaration.
- Opens cross-file navigation targets in DSH native tabs and provides exact-range Back and Forward history.
- Automatically closes common brackets and quotes, including selection wrapping, paired deletion, and language-aware backticks or Python triple quotes.
- Provides configurable two- or four-space indentation, generic bracket expansion on Enter, and aligned single- or multiline Tab operations.
- Uses Python syntax context for block, branch, multiline-expression, and closing-delimiter indentation.
- Generates Google Style Docstring placeholders after `"""` + Enter only at the first statement of a Python function, method, async function, or class.
- Provides local Java keyword, common-type, snippet, and current-document completion without a language server.
- Generates Structured Javadoc for Java methods and constructors from declarations already present in the document.
- Supports Java brackets, indentation, line comments, folding, and common declaration or control-flow snippets entirely offline.
- Cancels stale completion work, bounds Pyright recovery, and retires idle workspace language-server sessions.
- Offers optional auto save in DSH Settings with 10, 30, 60, or 120-second intervals; it is disabled by default.
- Saves with `Cmd+S` on macOS or `Ctrl+S` on Windows and reports dirty, saving, saved, failed, and read-only states.
- Detects external changes and refuses stale writes.
- Restores unsaved drafts after tab switches, tab closure, or page reloads.
- Preserves LF/CRLF, UTF-8 BOM, and POSIX file mode where supported.
- Safely rejects files that are too large, binary, non-UTF-8, mixed-line-ending, or otherwise unsafe to edit.
- Performs editing locally without model calls, telemetry, or file uploads.

## Requirements

| Component | Supported |
| --- | --- |
| Base editor | macOS or Windows |
| Python Intelligence | macOS or Windows |
| Java editing | macOS or Windows in v0.3.0; no JDK required |
| DSH Desktop | `0.2.1-rc.5` |
| Node.js | 20 or later when building from source |

## Install

### Install from npm

```bash
dsh plugin --profile desktop add dsh-codecraft@latest
```

Restart DSH Desktop after installation.

### Install from source

```bash
git clone https://github.com/lllirunze/dsh-codecraft.git
cd dsh-codecraft
npm install
npm run check
dsh plugin --profile desktop add "$PWD"
```

Restart DSH Desktop after installation. The plugin manifest automatically adds CodeCraft to the selected DSH profile; no manual profile editing is required.

## Update

Update an npm installation to the latest published version:

```bash
dsh plugin --profile desktop update --latest dsh-codecraft
```

Alternatively, installing an explicit version replaces the currently selected version:

```bash
dsh plugin --profile desktop add dsh-codecraft@0.3.1
```

Restart DSH Desktop after updating.

For a local source installation, pull the new source, rebuild it, and refresh the profile dependency:

```bash
git pull
npm install
npm run check
dsh plugin --profile desktop add "$PWD"
```

CodeCraft does not currently provide in-app update notifications or automatic background updates. Installation and updates are managed by the DSH CLI.

## Uninstall

```bash
dsh plugin --profile desktop remove dsh-codecraft
```

Restart DSH Desktop. Native file previews are restored automatically.

## Usage

1. Open a supported source or text file from DSH's workspace explorer.
2. DSH opens its native file tab and selects the CodeCraft renderer.
3. Edit the file and press `Cmd+S` on macOS or `Ctrl+S` on Windows, or use the Save action in the status bar.
4. Use the viewer menu above the tab to switch to DSH's native Code or Plain Text preview when needed.

Auto save is disabled by default. Open **Settings → CodeCraft** from the settings sidebar to enable it and choose a 10, 30, 60, or 120-second interval. Automatic and manual saves use the same conflict-safe write path.

New indentation always uses spaces. In the same settings section, choose a width of two or four spaces; the change applies to open editors without rewriting existing file content. Python files additionally use syntax-aware Enter indentation for blocks, branches, and multiline expressions.

To generate a Google Style Docstring, type `"""` as the first statement in a Python function, method, async function, or class, then press Enter inside the paired quotes. CodeCraft creates editable summary, `Args`, `Returns`, or `Yields` placeholders only when syntax context is conclusive. Triple quotes at module scope, in assignments, nested blocks, later statements, or prefixed strings remain ordinary multiline strings.

Python Intelligence is enabled by default for Python files on macOS and Windows. CodeCraft uses its bundled Pyright server and first selects an explicit interpreter or workspace `.venv`/`venv`; PATH fallback prefers `python3` on macOS and `python` on Windows. Open **Settings → CodeCraft → Python Intelligence** to disable semantic completion or provide absolute interpreter and language-server paths. The status bar reports `Starting`, `Ready`, or `Unavailable`; an unavailable server never disables normal editing or saving.

Semantic completion opens automatically while typing, including after member-access dots such as `service.`. Accepting a method, function, or constructor in a clear invocation context inserts `()` and leaves the caret inside when Pyright supplies a plain callable name. Assignment values, callback arguments, containers, imports, decorators, existing snippets, and existing parentheses remain unchanged. CodeCraft does not bind macOS `Option` combinations because they may produce composed input characters. `Ctrl+Space` remains available where the operating system does not reserve it.

Hover over a Python identifier to see information supplied by Pyright. Use `Command+Click` on macOS or `Ctrl+Click` on Windows to navigate from a use to its definition; use the same gesture on a declaration to open its grouped reference list. Cross-file targets open in DSH native tabs. The arrow controls in the editor status bar, or `Command/Ctrl+Alt+Left/Right`, move through successful navigation history.

Java support activates automatically for `.java` files. Completion includes Java keywords, common standard-library type names, snippets such as `psvm` and `sout`, and identifiers found in the current document. Type `/**` above a complete method or constructor and press Enter to generate CodeCraft Structured Javadoc. These features run locally without a JDK, JDT LS, a Java process, downloads, or network access. Java completion is lexical rather than project-aware: it does not resolve imports, dependencies, inferred members, or cross-file symbols.

### Keyboard shortcuts

| macOS | Windows | Action |
| --- | --- | --- |
| `Cmd+S` | `Ctrl+S` | Save the current file |
| `Cmd+F` | `Ctrl+F` | Search within the file |
| `Cmd+/` | `Ctrl+/` | Toggle line comments |
| `Cmd+Z` / `Cmd+Shift+Z` | `Ctrl+Z` / `Ctrl+Y` | Undo / redo |
| `Tab` / `Shift+Tab` | `Tab` / `Shift+Tab` | Indent / outdent |
| — | `Ctrl+Space` | Open completion manually |

## Documentation

- [Architecture and validation records](docs/README.md)
- [Plugin compatibility and known workarounds](docs/guide/plugin-compatibility.md)
- [Changelog](CHANGELOG.md)

## Limitations

- CodeCraft supports UTF-8 source and text files up to 2 MiB.
- Symbolic links are read-only.
- Python hover, signature help, diagnostics, automatic cross-file edits, and go-to-definition are not included yet.
- Java semantic completion, diagnostics, navigation, refactoring, and build integration are not included.
- Linux has not been validated and is not currently supported.
- There is no cross-window draft synchronization.

## License

MIT. See [LICENSE](LICENSE).
