# DSH CodeCraft

Edit source and text files directly in DSH's native file tabs with CodeMirror 6.

[中文](README.zh-CN.md)

> **Status:** v0.1.1 has passed automated validation. Real DSH Desktop regression testing is still required before release.

## Features

- Uses DSH's native workspace explorer and file tabs.
- Provides syntax highlighting, line numbers, folding, search, line comments, indentation, undo/redo, and basic completion.
- Saves with `Cmd+S` and reports dirty, saving, saved, failed, and read-only states.
- Detects external changes and refuses stale writes.
- Restores unsaved drafts after tab switches, tab closure, or page reloads.
- Preserves LF/CRLF, UTF-8 BOM, and POSIX file mode.
- Safely rejects files that are too large, binary, non-UTF-8, mixed-line-ending, or otherwise unsafe to edit.
- Performs editing locally without model calls, telemetry, or file uploads.

## Requirements

- macOS; Apple Silicon is the primary target.
- DSH Desktop `0.2.1-rc.5`.
- Node.js 20 or later when building from source.

## Install

### Install from npm

After the package is published:

```bash
dsh plugin --profile desktop add dsh-codecraft@latest
```

Restart DSH Desktop after installation.

### Install from source

```bash
git clone <repository-url>
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
dsh plugin --profile desktop add dsh-codecraft@0.1.1
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
3. Edit the file and press `Cmd+S`, or use the Save action in the status bar.
4. Use the viewer menu above the tab to switch to DSH's native Code or Plain Text preview when needed.

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd+S` | Save the current file |
| `Cmd+F` | Search within the file |
| `Cmd+/` | Toggle line comments |
| `Cmd+Z` / `Cmd+Shift+Z` | Undo / redo |
| `Tab` / `Shift+Tab` | Indent / outdent |
| `Ctrl+Space` | Open basic completion |

## Limitations

- CodeCraft supports UTF-8 source and text files up to 2 MiB.
- Symbolic links are read-only.
- There is no LSP, semantic diagnostics, automatic import, or go-to-definition support.
- Windows and Linux are not supported in v0.1.1.
- There is no cross-window draft synchronization.

## License

MIT. See [LICENSE](LICENSE).
