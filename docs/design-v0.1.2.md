# DSH CodeCraft v0.1.2 Editor Experience Design

| Field | Value |
| --- | --- |
| Status | Implemented; automated validation passed, Desktop regression pending |
| Target version | 0.1.2 |
| Baseline | 0.1.1 |
| Platform | DSH Desktop on macOS and Windows |
| Release theme | Editor experience improvements |

v0.1.2 improves two frequent, language-independent editing behaviors: optional automatic saving and predictable bracket or quote pairing. It does not add LSP support, project indexing, formatting, file management, Git, or a separate workspace shell.

## Auto-Save Settings

CodeCraft contributes a card to DSH's native Plugins settings surface. The Host exports a volatile `Config` schema, and the browser binds to the `codecraft` entry through DSH's `configForms` service. Accepted values are persisted by DSH and take effect without restarting Desktop.

Auto save is disabled by default. The interval defaults to 30 seconds and accepts only 10, 30, 60, or 120 seconds. Missing or invalid values resolve to safe defaults. The interval remains editable while auto save is disabled.

```ts
interface AutoSaveSettings {
  enabled: boolean
  intervalSeconds: 10 | 30 | 60 | 120
}
```

## Save Coordination and Safety

Each mounted native file tab owns its timer, so switching tabs cannot redirect a save to another document. A timer only triggers for an editing document that is dirty, writable, idle, and free of an unresolved conflict. Closing the tab, disabling auto save, changing the interval, or unloading the plugin removes the associated timer.

Automatic and manual triggers call the same save function. The function retains the existing expected-version check, conflict handling, draft preservation, line-ending handling, and atomic Host write. If another trigger arrives during a save, one follow-up request is queued. Save reconciliation compares the submitted content with the live editor content, so later keystrokes are never marked as saved accidentally.

## Bracket and Quote Behavior

CodeCraft supplies a high-precedence CodeMirror language-data entry so language packages cannot remove the required common pairs:

- parentheses, square brackets, and braces;
- single and double quotes;
- backticks for JavaScript, TypeScript, JSX, Markdown, Go, and SQL;
- triple single and double quotes for Python.

CodeMirror's `closeBrackets` implementation provides closer skipping, empty-pair deletion, selection wrapping, nesting, and syntax-aware quote handling. Angle brackets are deliberately excluded from generic pairing because they are commonly operators or type syntax.

## Module Boundaries

```text
src/
├── config.ts                         # Host Config schema
├── settings/schema.ts                # shared defaults and validation
└── client/
    ├── settings/                     # DSH form binding and settings card
    ├── document/auto-save.ts         # timer eligibility policy
    ├── document/save.ts              # save reconciliation
    └── editor/extensions/brackets.ts # pairing configuration
```

DSH owns settings persistence and the settings shell. CodeCraft owns validation, scheduling, and the editor contribution. Filesystem access remains exclusively behind the authenticated Host route.

## Acceptance Criteria

- Settings persist across Desktop restarts and update active editors without a restart.
- Only dirty, writable, non-conflicted documents auto-save.
- Manual saving remains immediate whether auto save is enabled or disabled.
- External changes are never silently overwritten and failed saves retain drafts.
- Required brackets and quotes pair, skip, delete, wrap, and nest correctly.
- Angle brackets do not pair generically.
- Native tabs, syntax highlighting, drafts, read-only fallbacks, and macOS/Windows shortcuts do not regress.

Draft loss, silent overwrite, writing the wrong tab, or bypassing the Host conflict check is a release blocker.
