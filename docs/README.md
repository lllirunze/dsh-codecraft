# Documentation

The root [README](../README.md) is the primary English user guide. [README.zh-CN.md](../README.zh-CN.md) provides the equivalent Simplified Chinese installation and usage guide. All files in this directory are maintained in English.

| Document | Purpose |
| --- | --- |
| [v0.1.0 design](design-v0.1.0.md) | Implemented scope, architecture, safety invariants, and compatibility decisions |
| [v0.1.0 validation](validation-v0.1.0.md) | Automated evidence, manual acceptance checklist, release gates, and remaining risks |
| [v0.1.1 design](design-v0.1.1.md) | Planned internal refactoring and language-extension foundation |

## Documentation Rules

- Keep installation and usage instructions in the root README files.
- Keep architecture and design decisions in versioned `design-v*.md` files.
- Keep verified evidence and acceptance status in versioned `validation-v*.md` files.
- Do not place duplicate versioned design documents in the repository root.
- Write every document in `docs/` in English.
- Update status claims only after completing the corresponding automated or manual validation.
