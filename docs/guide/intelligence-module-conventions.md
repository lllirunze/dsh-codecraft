# Intelligence Module Conventions

| Field | Value |
| --- | --- |
| Status | Project convention from v0.2.1 |
| Scope | Language, framework, and ecosystem intelligence modules |
| Principle | Share infrastructure, isolate specialization, and create files only when needed |

## Purpose

This document is the single source of truth for organizing CodeCraft intelligence modules. It defines module identity, dependency direction, naming, registration, testing, and lifecycle expectations. Version design documents should reference these rules instead of copying their own incompatible directory templates.

The convention governs CodeCraft's TypeScript source, not the layout of user projects. Language-specific generated content follows that language's community rules; for example, Python templates use PEP 8 names and Google Style Docstrings.

## Runtime Boundaries

CodeCraft has separate browser and Host bundles. A module must respect that boundary before pursuing visual directory symmetry.

```text
src/client/
├── editor/                 shared CodeMirror UI and editing behavior
├── languages/              syntax presentation and language-specific editor extensions
└── document/               browser document state, drafts, and save coordination

src/host/
├── intelligence/           shared semantic-provider coordination and lifecycle
├── lsp/                    reusable JSON-RPC, LSP session, and process protocol
├── languages/              Host-side semantic language providers and environments
├── frameworks/             future enhancements that depend on a supported language
└── ecosystems/             future project/toolchain enhancements that compose capabilities
```

CodeMirror objects never enter the Host bundle. Filesystem access, interpreter discovery, subprocesses, and language servers never enter the browser bundle. Transport-safe identifiers and protocol types belong in `src/protocol.ts` or another explicitly shared type-only boundary.

## Capability and Dependency Direction

The conceptual relationship is:

```text
shared intelligence and editor contracts
└── language capability
    ├── framework enhancement
    └── ecosystem enhancement
```

This relationship may use interfaces, registries, delegation, or composition. TypeScript `extends` is not required, and a deep inheritance tree is discouraged.

The following rules are mandatory:

- shared editor, intelligence, and LSP modules must not import a concrete language, framework, or ecosystem implementation;
- a language module reuses shared editor and Host services rather than copying completion UI, saving, LSP framing, or process supervision;
- a framework declares its required language capability and contributes only framework-specific behavior;
- an ecosystem declares every language, format, project-model, or toolchain capability it requires and may compose more than one;
- sibling enhancements must be independently loadable, so a Python project may eventually enable both FastAPI and PyTorch support;
- cross-module activation goes through an existing registry or an intentionally shared contract, never private DOM access or a second editor instance;
- every listener, request, document reference, and subprocess must follow the owning tab, workspace, plugin, and application lifecycle.

## Module Categories

### Languages

A language can have two related but separate implementations:

- `src/client/languages/<language>/` provides CodeMirror support, syntax-aware editor behavior, and presentation metadata;
- `src/host/languages/<language>/` provides semantic services, environment discovery, and language-server configuration.

Create only the side required by the feature. Syntax highlighting does not require a Host module, and a Host provider must not duplicate the client syntax package.

### Frameworks

A framework extends an already supported language. A future PyTorch provider depends on Python environment and semantic capabilities and contributes PyTorch-specific knowledge. It must not start a duplicate Python language server or reimplement interpreter discovery.

Framework modules belong under `src/host/frameworks/<framework>/` when they provide semantic or project services. Any browser presentation extension remains in a clearly named client feature and communicates through shared protocol types.

### Ecosystems

An ecosystem represents a project or toolchain concern that may span languages, such as Kubernetes, Helm, or Maven. It declares all required capabilities and contributes only ecosystem-specific schemas, project recognition, or semantic enhancements. Generic YAML support must not contain Kubernetes rules, and a Kubernetes module must not copy the YAML language implementation.

## Directory and File Roles

Only create files required by working behavior. A mature module may use this shape:

```text
<category>/<slug>/
├── index.ts                 public exports and registration
├── manifest.ts              identity, matching, dependencies, and capabilities
├── intelligence.ts          semantic capability entry, when applicable
├── features/                focused language/framework/ecosystem behavior
└── services/                external tool or environment adapters
```

| Path | Responsibility | Creation rule |
| --- | --- | --- |
| `index.ts` | Stable exports and registration | Create when a module has more than one internal unit or requires registration |
| `manifest.ts` | Identity, matching, dependencies, capabilities | Create when a registry consumes this metadata; do not invent a second registry |
| `intelligence.ts` | Main semantic capability composition | Create only for a concrete semantic provider |
| `features/` | Focused behavior such as indentation or Docstrings | Add one file per delivered responsibility |
| `services/` | Interpreter, SDK, schema, build tool, or server adaptation | Add only for a real external integration |

Tests remain under the repository's flat `tests/` directory. Use names such as `tests/python-indentation.test.ts`, `tests/python-intelligence.test.ts`, or `tests/pytorch-intelligence.test.ts`. Test fixtures may live under `tests/fixtures/<category>/<slug>/` when inline samples are no longer readable.

## Naming

| Item | Rule | Example |
| --- | --- | --- |
| Language directory | Stable lowercase slug | `python/`, `java/`, `cpp/` |
| Framework directory | Lowercase kebab-case | `pytorch/`, `spring-boot/` |
| Ecosystem directory | Lowercase kebab-case | `kubernetes/`, `maven/` |
| Common entry files | Lowercase fixed names | `index.ts`, `manifest.ts`, `intelligence.ts` |
| Feature or service file | Lowercase kebab-case or one clear word | `docstrings.ts`, `model-completion.ts`, `environment.ts` |
| Exported class or type | PascalCase with category context | `PythonIntelligence`, `LanguageModule` |
| Functions and values | camelCase | `createPythonExtensions` |
| Module ID | Category plus stable slug | `language:python`, `framework:pytorch` |
| Test file | Responsibility plus `.test.ts` | `python-indentation.test.ts` |

Use existing repository formatting: two-space indentation, single quotes, no semicolons, and `.js` suffixes in ESM imports.

## Manifest Contract

A manifest is useful only when the active registry needs declarative metadata. Its conceptual minimum is:

```typescript
type IntelligenceModuleManifest = {
  id: `language:${string}` | `framework:${string}` | `ecosystem:${string}`
  displayName: string
  requires: readonly string[]
  capabilities: readonly string[]
}
```

A language may also declare file extensions or language identifiers. A framework must declare at least one language capability. An ecosystem may require multiple capabilities and should distinguish required from optional dependencies when the real registry supports that distinction.

This example is not permission to create a parallel module registry. Extend the existing language or provider registry when it can express the requirement; add a shared contract only when a shipped module needs it.

## Python Reference Layout

Python is the first reference implementation. Its responsibilities remain split by runtime:

```text
src/client/languages/python/
├── index.ts
└── features/
    ├── indentation.ts
    ├── strings.ts              # only when custom behavior is required
    └── docstrings.ts           # only when the feature ships

src/host/languages/python/
├── environment.ts
├── index.ts                    # add when registration needs a stable entry
└── provider.ts                 # add only if provider logic outgrows the shared manager
```

Shared CodeMirror setup stays in `src/client/editor/`. Shared Pyright-independent coordination stays in `src/host/intelligence/`. JSON-RPC and LSP sessions stay in `src/host/lsp/`. Python must not copy any of these layers merely to make its directory look self-contained.

Existing files should move only when extraction produces a real ownership or testability improvement. v0.2.1 may extract the inline Python client adapter and its indentation extension, but it should not relocate stable Host LSP files for symmetry.

## Adding or Changing a Module

1. Classify the unit as a language, framework, or ecosystem and state its user value.
2. List the shared capabilities it reuses and the external tools it requires.
3. Prove the runtime boundary: client presentation versus Host filesystem, process, and semantic work.
4. Add the smallest real directory and files; do not scaffold future features.
5. Register through an existing registry and declare a unique module ID if one is needed.
6. Add focused tests plus regressions for shared editing, saving, lifecycle, and sibling modules.
7. Document settings, limitations, cleanup behavior, and security implications.
8. Update this convention in the same change if the module reveals a reusable rule that is missing.

## Review Checklist

- [ ] The category, unique identity, and user-visible capability are clear.
- [ ] Browser and Host responsibilities remain separated.
- [ ] Parent capabilities are reused; shared UI, LSP, save, and lifecycle code are not copied.
- [ ] Framework and ecosystem dependencies are explicit and composable.
- [ ] Only implemented features have files, settings, tests, and release claims.
- [ ] Naming and exports follow this convention and repository style.
- [ ] Tests cover activation, failure, isolation, cleanup, and relevant editor regressions.
- [ ] Server processes and listeners are released on tab, workspace, plugin, and application teardown.
- [ ] The version design document references this convention and records intentional exceptions.

## Prohibited Patterns

- importing Python-specific behavior from shared editor, intelligence, or LSP modules;
- copying a parent language server or environment detector into a framework;
- allowing public shared layers to depend on a concrete child module;
- creating empty future language, framework, ecosystem, service, or test directories;
- bypassing authenticated Host routes, workspace containment, safe saving, or DSH lifecycle services;
- changing stable file locations solely to make modules visually symmetrical.

## Maintenance

Compatibility and minimal migration take priority over cosmetic conformance. When an existing layout differs, document the reason and migrate only with a concrete benefit. Any convention change must update this document, affected modules, tests, and the relevant version design together.

