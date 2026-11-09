# GitHub Release Content Example

Use this structure after the release commit and tag have been pushed. Adapt the summary and bullets to the verified target version; do not copy features that are absent from that release.

## Release title

```text
v0.4.0
```

## Release body

```markdown
## DSH CodeCraft v0.4.0

Offline HTML editing foundation and assistance.

- Add local HTML5 parsing, highlighting, contextual completion, entities, comments, and snippets
- Add safe tag closing and syntax-aware two- or four-space indentation
- Support HTML void and optional-end elements without unsafe forced closures
- Add a persistent live HTML Editing Assistance switch with Ready, Disabled, and Error states
- Keep all HTML assistance offline without a language server, subprocess, or runtime download
```

For a prerelease, retain the complete suffix everywhere. For example, use title `v0.4.0-rc.0` and heading `## DSH CodeCraft v0.4.0-rc.0`.
