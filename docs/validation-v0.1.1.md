# DSH CodeCraft v0.1.1 Validation Record

| Field | Value |
| --- | --- |
| Status | Automated validation passed; Desktop regression pending |
| Recorded | 2026-11-04 |
| Target | macOS, DSH Desktop `0.2.1-rc.5` |
| Design | [design-v0.1.1.md](design-v0.1.1.md) |

## Automated Result

The complete repository check passes:

```bash
npm run check
```

Validation includes strict TypeScript compilation, 47 Vitest tests across seven files, host and client builds, declaration generation, and package-output verification.

The new regression coverage verifies:

- duplicate-safe language IDs and extensions;
- case-insensitive language selection and special TypeScript declaration filenames;
- the conservative project-root default;
- clean, restored, and stale draft initialization;
- clean reload versus dirty conflict decisions for external changes;
- deleted-file conflict behavior;
- clean and still-dirty outcomes after an asynchronous save.

Existing coverage continues to verify filesystem confinement, encoding and newline validation, symbolic links, atomic replacement, optimistic concurrency, authenticated routes, request limits, draft persistence, address parsing, and build registration.

## Manual Desktop Regression

Complete these checks in DSH Desktop before publishing `v0.1.1`:

- [ ] Supported files still open in CodeMirror inside native file tabs.
- [ ] Typing, selection, clipboard, undo/redo, search, folding, comments, indentation, and bracket closing work.
- [ ] `Cmd+S` and the status-bar action save successfully.
- [ ] Edits made while a save is pending remain dirty.
- [ ] External changes reload a clean editor and conflict with a dirty editor without overwriting either copy.
- [ ] Drafts survive tab switching, closing, and page refresh.
- [ ] Unsupported and unsafe files retain safe fallback behavior.
- [ ] Light/dark themes and resizing remain stable.
- [ ] The plugin works without community plugins.
- [ ] Disabling or uninstalling CodeCraft restores the native preview.
- [ ] Typing, scrolling, and tab switching show no visible performance regression.

Draft loss, silent overwrite, or unauthorized writes are release blockers.

## Deferred Scope

This release intentionally excludes LSP support, language-server processes, project indexing, language-specific intelligent completion, autosave, a separate IDE shell, and Windows/Linux support.
