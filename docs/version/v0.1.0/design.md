# DSH CodeCraft v0.1.0 Design

| Field | Value |
| --- | --- |
| Status | Implemented; Desktop manual acceptance pending |
| Version | 0.1.0 |
| Revised | 2026-11-03 |
| Target host | DSH Desktop `0.2.1-rc.5` on macOS |
| Scope | Local source editing inside native file tabs |

This document describes the implemented v0.1.0 system. See [validation.md](validation.md) for evidence, release gates, and remaining risks.

## Goals and Scope

CodeCraft adds local editing for supported source and text files without replacing DSH's workspace explorer, native tabs, or viewer menu. It provides CodeMirror 6 editing, syntax support, search, folding, indentation, comments, basic completion, `Cmd+S`, draft recovery, conflict detection, and safe full-file saves.

It preserves UTF-8 BOM, LF/CRLF, and file mode. Oversized, binary, malformed, mixed-newline, or unwritable files fall back safely. v0.1.0 does not provide file management, Git, terminals, debugging, builds, agents, LSP features, semantic completion, or cross-platform support.

## Architecture

```text
DSH workspace explorer
  -> native file tab / Document Preview
    -> CodeCraft client (renderer, CodeMirror, draft state)
      -> authenticated POST /codecraft/api
        -> CodeCraft host (session authority, safe read/save)
          -> workspace filesystem
```

DSH owns file discovery, tab lifecycle, and viewer selection. CodeCraft owns only its renderer body and draft state. The client registers a `dsh-codecraft` document preview and the matching `sidebar.right.tab.document` body. `loading: 'renderer'` ensures CodeCraft reads the complete file instead of treating a paginated preview as editable content.

The host exposes one exact JSON endpoint with three actions:

| Action | Purpose |
| --- | --- |
| `read` | Validate and read a complete file, returning a version baseline |
| `save` | Save an existing file against an expected version |
| `stat` | Check existence and version without reading content |

The browser supplies a session ID and workspace-relative path; the host derives the authoritative workspace root from the session.

## Module Responsibilities

| Module | Responsibility |
| --- | --- |
| `src/index.ts` | Host entry point and route lifecycle |
| `src/host/routes.ts` | Authentication, request limits, validation, and error mapping |
| `src/host/files.ts` | Path confinement, text validation, version checks, and atomic saves |
| `src/client/index.tsx` | Client registration |
| `src/client/CodeCraftBody.tsx` | Editor lifecycle, saving, drafts, and conflict state |
| `src/client/editor.ts` | CodeMirror configuration and document helpers |
| `src/client/drafts.ts` | In-memory and `localStorage` draft persistence |
| `src/client/languages.ts` | Extension allowlist and language mapping |
| `src/protocol.ts` | Shared client/host protocol |

## Read and Save Semantics

Reads resolve the session workspace, enforce lexical and real-path boundaries, require an allowed regular file no larger than 2 MiB, and validate UTF-8 and newline consistency. They record BOM, newline style, mode, indentation, and an `mtimeNs:size:ino` version, then recheck the version after reading. Symlinks inside the workspace may be opened read-only; links escaping the workspace are rejected.

Saves reject symlink destinations and non-regular files, validate size and newline format, and compare `expectedVersion` with the current version. The host writes an exclusive temporary file in the target directory, restores BOM/CRLF and mode, flushes it, rechecks the target version, and atomically renames it. Detectable version changes return a conflict instead of overwriting disk content. A very small race remains between the final check and rename because this is not a distributed lock.

## Document and Draft State

Each document tracks its base version, saved text, dirty/saving/read-only flags, and external-change state. Edits made during a save remain dirty after that snapshot succeeds. External changes reload safely when no draft exists; otherwise the draft is preserved and a conflict is shown. Successful saves and explicit discard actions remove the draft.

Draft keys use the full resource address and store content, baseline version, newline style, BOM, selection, and scroll position. Storage combines module memory with a `localStorage` mirror.

## Security and Compatibility Invariants

- Every API request passes `ctx.connection.requestRejection`.
- The host never trusts a browser-provided workspace root.
- Paths must pass both lexical and real-path confinement checks.
- Paginated preview content is never saved as a complete file.
- Saves never follow a final-path symlink or silently resolve conflicts.
- File contents are not sent to models, telemetry, or external services.
- Client registrations, styles, and host routes use `ctx.effect` lifecycle cleanup.
- Only DSH `0.2.1-rc.5` on macOS Apple Silicon is declared verified; Windows and Linux are unsupported.

Future candidates include a single-language LSP integration, followed by carefully scoped hover, navigation, import, and quick-fix features without turning CodeCraft into a separate IDE.
