# DSH CodeCraft v0.1.0 Validation Record

| Field | Value |
| --- | --- |
| Status | Automated validation passed; Desktop manual acceptance pending |
| Recorded | 2026-11-03 |
| Target | macOS Apple Silicon, DSH `0.2.1-rc.5` |
| Design | [design-v0.1.0.md](design-v0.1.0.md) |

This record separates completed evidence from unverified Desktop behavior.

## Current Result

Technical feasibility, editor implementation, and the safe edit/save loop passed automated validation. Real DSH Desktop input, theme, lifecycle, and uninstall behavior still require manual acceptance.

Verified host contracts include document-preview registration, the `sidebar.right.tab.document` slot, renderer-managed loading, exact host routes, connection rejection, and session-based workspace resolution.

## Automated Evidence

Run the complete suite with:

```bash
npm run check
```

At the time of this record, strict TypeScript checks, 39 Vitest tests across six files, host and browser bundles, declaration output, module-loader wrapping, external dependencies, and plugin registration all passed.

Coverage includes complete reads, the 2 MiB limit, concurrent read changes, UTF-8 validation, BOM and newline handling, path traversal, internal and escaping symlinks, mode preservation, save conflicts, temporary-file cleanup, API authentication and limits, drafts, resource parsing, language mapping, and edits made while a save is pending.

An isolated DSH profile also confirmed that the client bundle entered the boot graph, the bundle endpoint responded, unauthenticated host calls returned 401, missing sessions returned 404, and no community plugin was required. A controlled DOM stub confirmed renderer, slot, localization, and scoped-style registration. These checks do not replace real Chromium/Desktop interaction.

## Security Result

- Browser requests cannot select the workspace root.
- Lexical and resolved paths cannot escape the workspace.
- Final-path symlinks cannot be saved.
- Reads and saves use file-version checks.
- Conflicts preserve both disk content and the local draft.
- Temporary files use exclusive creation and are cleaned up after failure.
- Incomplete, unsafe, or unwritable text never enters a savable state.

The final version check and atomic rename are not a distributed lock, so a narrow race remains.

## Desktop Acceptance Checklist

### Installation and Editing

- [ ] A local package installs and DSH Desktop starts normally without community plugins.
- [ ] Supported files open in CodeMirror inside native tabs; unsupported files retain native previews.
- [ ] Input, selection, clipboard, scrolling, undo/redo, search, comments, folding, and bracket handling work.
- [ ] `Cmd+S` is scoped to the focused editor and status indicators remain accurate.
- [ ] Light/dark themes and window/sidebar resizing remain readable and stable.

### Saving, Conflicts, and Drafts

- [ ] Successful saves write correct disk content and clear the saved draft.
- [ ] Edits made during a save remain dirty and can be saved again.
- [ ] External changes reload safely without a draft and produce a conflict with a draft.
- [ ] A 409 conflict never overwrites disk content.
- [ ] Deleted files retain drafts and show an explicit message.
- [ ] Drafts survive tab switching, tab closing, and page refresh.
- [ ] Explicit discard clears a draft; navigation with drafts prompts before leaving.

### Fallback and Removal

- [ ] Oversized, binary, non-UTF-8, and mixed-newline files show safe fallback messages.
- [ ] Internal symlinks are read-only.
- [ ] Users can switch to native Code or Plain Text viewers.
- [ ] Disabling or uninstalling the plugin restores the native preview after restart.

## Release Gates and Remaining Risks

The implementation, automated checks, documentation, changelog, license, and npm file list are complete. Release remains gated on the checklist above, regression fixes, and a validated release commit/tag.

Remaining risks include unverified `dsh-app://` Desktop forwarding, host-contract changes in later DSH versions, browser storage quotas or clearing, the lack of multi-window draft synchronization, and atomic replacement not preserving hard-link relationships or extended attributes.
