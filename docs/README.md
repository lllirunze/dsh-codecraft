# Documentation

The root [README](../README.md) is the primary English user guide. [README.zh-CN.md](../README.zh-CN.md) provides the equivalent Simplified Chinese installation and usage guide. All files in this directory are maintained in English.

## Version Records

Each release has one directory under [`version/`](version/). `design.md` records scope and architecture; `validation.md` records planned or completed evidence.

| Version | Design | Validation | Summary |
| --- | --- | --- | --- |
| v0.1.0 | [Design](version/v0.1.0/design.md) | [Validation](version/v0.1.0/validation.md) | Initial safe editor integration |
| v0.1.1 | [Design](version/v0.1.1/design.md) | [Validation](version/v0.1.1/validation.md) | Internal refactoring and language-extension foundation |
| v0.1.2 | [Design](version/v0.1.2/design.md) | [Validation](version/v0.1.2/validation.md) | Auto-save settings and bracket pairing |
| v0.1.3 | [Design](version/v0.1.3/design.md) | [Validation](version/v0.1.3/validation.md) | Settings-entry regression fix |
| v0.1.4 | [Design](version/v0.1.4/design.md) | [Validation](version/v0.1.4/validation.md) | Configurable indentation and delimiter expansion |
| v0.2.0 | [Design](version/v0.2.0/design.md) | [Validation](version/v0.2.0/validation.md) | Project-aware Python completion and reusable intelligence infrastructure |
| v0.2.1-rc.0 | [Design](version/v0.2.1-rc.0/design.md) | [Validation](version/v0.2.1-rc.0/validation.md) | Released Windows compatibility preview with native acceptance |
| v0.2.1 | [Design](version/v0.2.1/design.md) | [Validation](version/v0.2.1/validation.md) | Python-aware indentation with macOS and Windows acceptance |
| v0.2.2 | [Design](version/v0.2.2/design.md) | [Validation](version/v0.2.2/validation.md) | Implemented Python reliability, guarded Google Style Docstrings, and context-safe callable completion; Desktop acceptance pending |
| v0.3.0 | [Design](version/v0.3.0/design.md) | [Validation](version/v0.3.0/validation.md) | Lightweight offline Java editing, local completion, snippets, and Structured Javadoc |
| v0.3.1 | [Design](version/v0.3.1/design.md) | [Validation](version/v0.3.1/validation.md) | Validated Python Hover, semantic definition and reference navigation, native-tab reveal, and navigation history |
| v0.3.2 | [Design](version/v0.3.2/design.md) | [Validation](version/v0.3.2/validation.md) | Package metadata correction with no functional changes |
| v0.3.3 | [Design](version/v0.3.3/design.md) | [Validation](version/v0.3.3/validation.md) | Validated persistent, live Java Editing Assistance setting |
| v0.4.0 | [Design](version/v0.4.0/design.md) | [Validation](version/v0.4.0/validation.md) | Validated offline HTML foundation, completion, input assistance, and live feature gate on macOS and Windows |

## Project Guides

Long-lived engineering conventions and operational guidance live in [`guide/`](guide/).

| Document | Purpose |
| --- | --- |
| [External language tools](guide/external-language-tools.md) | Decision gates, distribution safety, lifecycle, and platform rules for optional language servers and toolchains |
| [Intelligence module conventions](guide/intelligence-module-conventions.md) | Layout, dependencies, naming, lifecycle, and testing rules for language, framework, and ecosystem modules |
| [Plugin compatibility](guide/plugin-compatibility.md) | Known conflicts and configuration workarounds for other DSH plugins |
| [Release guidelines](guide/releasing.md) | Required versioning checks and GitHub Release note format |

## Documentation Rules

- Keep installation and usage instructions in the root README files.
- Keep each version's design and validation records in `version/vX.Y.Z/design.md` and `validation.md`.
- Mark validation plans and evidence accurately; never present an unchecked plan as a completed result.
- Keep long-lived conventions and operational instructions in `guide/`.
- Do not place duplicate version documents in the repository root.
- Write every document in `docs/` in English.
- Update status claims only after completing the corresponding automated or manual validation.
