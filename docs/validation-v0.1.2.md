# DSH CodeCraft v0.1.2 Validation Record

| Field | Value |
| --- | --- |
| Status | Automated validation passed; Desktop regression pending |
| Recorded | 2026-11-04 |
| Target | macOS and Windows, DSH Desktop `0.2.1-rc.5` |
| Design | [design-v0.1.2.md](design-v0.1.2.md) |

## Automated Result

The complete repository check passes:

```bash
npm run check
```

Validation includes strict TypeScript compilation, 61 Vitest tests across eight files, Host and client builds, declaration generation, and package-output verification.

New coverage verifies:

- default and malformed auto-save setting resolution;
- every supported interval and millisecond conversion;
- dirty, read-only, saving, conflict, and editor-lifecycle eligibility;
- nested DSH settings mutations and accepted Host snapshots;
- all required bracket and quote pairs;
- closer skipping, paired deletion, selection wrapping, and nesting;
- exclusion of generic angle-bracket pairing;
- language-scoped backticks and Python triple-quote configuration.

Existing tests continue to cover workspace confinement, encoding and newline validation, symbolic links, checked atomic replacement, authenticated routes, draft persistence, external changes, save reconciliation, language selection, and native slot registration.

## Manual Desktop Regression

Complete these checks on macOS and Windows before publishing `v0.1.2`:

- [ ] CodeCraft appears under **Settings → Plugins** with a native switch and interval selector.
- [ ] Auto save defaults to off and 30 seconds on a fresh configuration.
- [ ] Changes persist after restarting DSH Desktop and affect open editors without a restart.
- [ ] Each 10, 30, 60, and 120-second interval can be selected while auto save is on or off.
- [ ] A dirty writable file saves at the configured interval; a clean or read-only file does not write.
- [ ] Two open tabs save their own content without crossing paths.
- [ ] `Cmd+S` on macOS and `Ctrl+S` on Windows remain immediate with auto save on or off.
- [ ] Editing during an in-flight save remains dirty and is saved by the queued follow-up.
- [ ] External modification, deletion, permission failure, and save failure preserve the draft and show feedback.
- [ ] Parentheses, brackets, braces, single quotes, and double quotes pair, skip, delete, wrap, and nest correctly.
- [ ] JavaScript/TypeScript/Markdown backticks and Python triple quotes behave correctly.
- [ ] Typing `<` does not insert `>` generically.
- [ ] Native file tabs, syntax highlighting, folding, indentation, undo/redo, drafts, themes, and plugin compatibility do not regress.

Draft loss, silent overwrite, or a save applied to the wrong document is a release blocker.
