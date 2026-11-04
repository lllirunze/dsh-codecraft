# DSH CodeCraft v0.2.0 Validation

| Field | Value |
| --- | --- |
| Status | Automated validation and macOS Host startup passed; interactive Desktop acceptance pending |
| Baseline | 0.1.4 |
| Target | 0.2.0 |
| DSH Desktop | 0.2.1-rc.5 |
| Pyright | 1.1.414 |

## Automated Evidence

`npm run check` passes with 84 tests across 11 files. It covers strict TypeScript checking, the Vitest suite, Host and browser builds, and package artifact verification.

The suite includes a real Pyright process and a temporary multi-file Python project. The live document is supplied from unsaved memory while another module remains on disk; completion resolves the imported class and returns its `create_user` member. Additional tests cover bounded LSP framing, split messages, malformed lengths, UTF-16 positions, member-trigger recognition, environment discovery, settings validation, authenticated request validation, and existing editor and save regressions. A restarted server replays every synchronized document before retrying completion.

`npm pack --dry-run --json` passes after the prepack check. The published package declares pinned Pyright `1.1.414` as a production dependency. The Host bundle keeps the DSH process service structural and does not bundle or duplicate DSH internals.

## Host Startup Evidence

The repository is linked into the desktop profile. DSH Desktop starts successfully with the new `subprocess` injection and Python Intelligence configuration schema, and its Host process remains running. Pyright is resolved through the linked plugin dependency. This proves plugin loading but does not replace editor interaction acceptance.

## Required Desktop Acceptance

Complete these checks in DSH Desktop on macOS before release:

- Open a Python file and confirm the status changes from `Python: Starting` to `Python: Ready`.
- In a two-file project, import a class and confirm `instance.` offers a member defined in the other file.
- Add an unsaved member, reference it from another open Python file, and confirm completion reflects the in-memory revision.
- Confirm imports and members from a package installed in the selected `.venv` appear.
- Use `Option+I` or `Option+\`` on macOS (`Ctrl+Space` may be reserved by the input-source switcher), typing activation, keyboard selection, acceptance, and one-step Undo.
- Change or invalidate the interpreter path and confirm a non-blocking `Unavailable` state followed by recovery.
- Disable semantic completion and confirm syntax highlighting, editing, manual save, auto save, drafts, conflict handling, brackets, and indentation continue to work.
- Close Python tabs and quit DSH, then confirm no Pyright process remains.
- Confirm `dsh-better-sidebar` coexistence using the documented compatibility setting.

## Release Gates

Do not release v0.2.0 until the Desktop checklist passes, no Pyright process remains after shutdown, and the package version, lockfile, changelog heading, tag, and GitHub Release all use `0.2.0` as required by the release guidelines.
