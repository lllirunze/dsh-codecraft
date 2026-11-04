# Documentation

The root [README](../README.md) is the primary English user guide. [README.zh-CN.md](../README.zh-CN.md) provides the equivalent Simplified Chinese installation and usage guide. All files in this directory are maintained in English.

| Document | Purpose |
| --- | --- |
| [v0.1.0 design](design-v0.1.0.md) | Implemented scope, architecture, safety invariants, and compatibility decisions |
| [v0.1.0 validation](validation-v0.1.0.md) | Automated evidence, manual acceptance checklist, release gates, and remaining risks |
| [v0.1.1 design](design-v0.1.1.md) | Implemented internal refactoring and language-extension foundation |
| [v0.1.1 validation](validation-v0.1.1.md) | Automated results and the required Desktop regression checklist |
| [v0.1.2 design](design-v0.1.2.md) | Persistent auto-save settings, safe scheduling, and bracket-pairing behavior |
| [v0.1.2 validation](validation-v0.1.2.md) | Automated evidence and the required Desktop acceptance checklist |
| [v0.1.3 validation](validation-v0.1.3.md) | Settings-entry regression fix and focused Desktop acceptance checklist |
| [v0.1.4 design](design-v0.1.4.md) | Configurable space indentation, generic delimiter expansion, and aligned single- or multiline editing |
| [v0.1.4 validation](validation-v0.1.4.md) | Automated indentation evidence and the required Desktop acceptance checklist |
| [v0.2.0 design](design-v0.2.0.md) | Implemented project-aware Python completion and reusable semantic-intelligence architecture |
| [v0.2.0 validation](validation-v0.2.0.md) | Automated Python/LSP evidence, Host startup result, and pending Desktop acceptance checklist |
| [Plugin compatibility](plugin-compatibility.md) | Known conflicts and configuration workarounds for other DSH plugins |
| [Release guidelines](releasing.md) | Required versioning checks and GitHub Release note format |

## Documentation Rules

- Keep installation and usage instructions in the root README files.
- Keep architecture and design decisions in versioned `design-v*.md` files.
- Keep verified evidence and acceptance status in versioned `validation-v*.md` files.
- Do not place duplicate versioned design documents in the repository root.
- Write every document in `docs/` in English.
- Update status claims only after completing the corresponding automated or manual validation.
