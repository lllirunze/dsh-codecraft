<div align="center">

# DSH CodeCraft

**A precise, safe CodeMirror 6 editor inside DSH's native file tabs.**

[![npm version](https://img.shields.io/npm/v/dsh-codecraft?logo=npm&label=npm)](https://www.npmjs.com/package/dsh-codecraft)
[![DSH compatibility](https://img.shields.io/badge/DSH-0.2.2--rc.3-5b5bd6)](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.3)
[![CI](https://github.com/lllirunze/dsh-codecraft/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/lllirunze/dsh-codecraft/actions/workflows/ci.yml)
[![platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows-4c8bf5)](#requirements)
[![license](https://img.shields.io/github/license/lllirunze/dsh-codecraft)](LICENSE)

[English](README.md) · [简体中文](README.zh-CN.md) · [Documentation](docs/README.md)

</div>

> **Status:** v0.5.4 validates the per-language settings layout, collapsible Python details, and live Python Intelligence settings on DSH Desktop 0.2.2-rc.3 across macOS and Windows.

## Features

- Integrates with DSH's native workspace explorer and file tabs, including file operations, breadcrumbs, and Material file icons.
- Provides CodeMirror editing with highlighting, folding, search, comments, completion, bracket handling, Undo/Redo, and configurable two- or four-space indentation.
- Saves writable changes immediately with conflict checks while preserving line endings, UTF-8 BOM, and supported file modes; unsafe files fall back safely.
- Adds project-aware Python completion, Hover, definition/reference navigation, navigation history, syntax-aware indentation, and Google Style Docstrings through managed Pyright.
- Adds fully local Java completion, snippets, Structured Javadoc, indentation, comments, and folding without requiring a JDK or language server.
- Adds offline HTML completion, diagnostics, Outline, navigation, formatting, Emmet, safe tag/ID rename, and native browser preview.
- Provides persistent per-language settings with always-visible master switches and collapsible Python details.
- Keeps editing local, with no model calls, telemetry, or file uploads.

## Requirements

| Component | Supported |
| --- | --- |
| Base editor | macOS or Windows |
| Python Intelligence | macOS or Windows |
| Java editing | macOS or Windows in v0.3.0; no JDK required |
| HTML editing | macOS or Windows in v0.4.2; fully offline |
| DSH Desktop | `0.2.2-rc.3` |
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
dsh plugin --profile desktop add dsh-codecraft@0.5.4
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
2. Edit normally in the native tab. Writable changes save immediately through the conflict-checked path; the footer reports read-only, external-change, conflict, or save failures.
3. Open **Settings → CodeCraft** to choose two- or four-space indentation and configure the Python, Java, or HTML assistance switches. Disabling assistance never disables ordinary editing or saving.
4. Use the viewer menu above the tab to switch to DSH's native Code or Plain Text preview when needed.

Language-specific highlights:

- **Python:** bundled Pyright provides completion and Hover. Use `Command+Click` on macOS or `Ctrl+Click` on Windows for definitions and references; configure interpreter or server paths in the expanded Python settings.
- **Java:** `.java` files receive local lexical completion and snippets. Type `/**` above a method or constructor and press Enter to generate Structured Javadoc.
- **HTML:** `.html` and `.htm` files receive offline completion, diagnostics, navigation, formatting, refactoring, and **Preview in Browser** without a language server or network connection.

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
- Python signature help, diagnostics, automatic cross-file edits, and refactoring are not included.
- Java semantic completion, diagnostics, navigation, refactoring, and build integration are not included.
- HTML diagnostics and refactoring are intentionally current-document scoped; CSS/JavaScript analysis, cross-file rename, and cross-language project association are not included.
- Linux has not been validated and is not currently supported.

## License

MIT. See [LICENSE](LICENSE).
