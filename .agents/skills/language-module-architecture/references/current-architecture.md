# Current Language Module Architecture

This reference describes the checked-out repository structure that module work must follow. Reinspect the source before acting because the architecture may evolve.

## Two bundles, one typed boundary

The build produces separate runtimes:

```text
src/index.ts             -> Node.js Host bundle: lib/index.js
src/client/index.tsx     -> browser Client bundle: lib/client.js
```

The separation is functional, not cosmetic:

```text
DSH native file tab
  -> Client renderer and CodeMirror
  -> typed request in src/protocol.ts
  -> authenticated /codecraft/api Host route
  -> workspace-safe file or intelligence service
  -> serializable result
  -> Client verifies document/tab revision and renders it
```

Client code must not import `src/host/`. Host code must not import `src/client/`. Both may consume wire-safe types from `src/protocol.ts` and settings data from `src/settings/schema.ts`.

## Client responsibilities

```text
src/client/
├── core/plugin.ts                  DSH preview, slot, locale, settings, and lifecycle registration
├── renderer/CodeCraftBody.tsx      one native-tab editor body and request/document lifecycle
├── editor/                         shared CodeMirror composition and generic extensions
├── languages/
│   ├── index.ts                    adapter registration and file-extension resolution
│   ├── registry.ts                 duplicate-safe language registry
│   ├── EditorLanguageAdapter.ts    browser language presentation contract
│   ├── python/                     Python CodeMirror behavior
│   ├── java/                       Java local assistance
│   └── html/                       HTML local assistance
├── document/                       browser document, conflict, save, and AutoSave coordination
├── settings/                       accepted configuration snapshots and settings UI
├── api.ts                          typed same-origin calls to the Host route
└── navigation/                     native-tab navigation presentation and history
```

Put a capability on the Client when it can operate safely on the loaded document and browser/editor state:

- CodeMirror parser/language support and highlighting;
- local completion metadata or identifiers from the current document;
- snippets, Docstring/Javadoc generation, tags, comments, auto-close, and indentation;
- editor commands, keymaps, compartments, status presentation, Hover UI, and navigation UI;
- tab-local cancellation, revision checks, and rendering of Host results;
- settings controls and accepted live reconfiguration.

Keep generic editor behavior in `src/client/editor/`. A rule belongs in `src/client/languages/<slug>/features/` when it depends on that language's syntax or semantics.

## Host responsibilities

```text
src/host/
├── routes.ts                       authenticated request validation and dispatch
├── files.ts                        workspace-safe filesystem operations
├── context.ts                      structural DSH Host service contracts
├── intelligence/
│   ├── provider.ts                 semantic provider contract
│   └── manager.ts                  workspace sessions, recovery, lifecycle, public results
├── lsp/                            shared JSON-RPC/LSP transport and session behavior
├── languages/python/               Python provider, interpreter/server discovery, platform policy
├── frameworks/                     reserved for concrete framework providers
└── ecosystems/                     reserved for concrete project/toolchain providers
```

Put a capability on the Host when it needs trust or Node/DSH services:

- workspace-authorized filesystem or project inspection;
- cross-file semantic analysis;
- interpreter, SDK, compiler, executable, or environment discovery;
- managed language-server or tool subprocesses;
- OS-specific platform policy;
- session pooling, recovery, process teardown, or safe excerpts from workspace files.

The Host must derive the workspace from the authenticated DSH Session and enforce containment. The Client may send a session identity and tab path but never chooses a trusted root.

## Existing module examples

### HTML: Client-only editing assistance

`src/client/languages/html/` owns parsing, contextual completion, tag closing, and indentation. It uses the already loaded document and CodeMirror, so there is no `src/host/languages/html/`. Adding an empty Host directory for symmetry would be wrong.

### Java: Client-only lightweight assistance

`src/client/languages/java/` owns local completion, snippets, and Structured Javadoc. It deliberately does not require a JDK, JDT LS, Host provider, process, or network. A future project-aware Java service would add a separate Host responsibility without relocating local editor behavior.

### Python: Hybrid Client and Host capability

Client:

- `src/client/languages/python/` owns syntax-aware indentation and Docstrings.
- shared Client extensions translate CodeMirror positions and render semantic completion/navigation results.
- the renderer synchronizes tab content, revision, settings, cancellation, and status.

Host:

- `src/host/languages/python/` owns Pyright launch, interpreter discovery, matching, and platform support.
- `src/host/intelligence/` owns workspace-scoped provider sessions, recovery, status, result filtering, and teardown.
- `src/host/lsp/` owns transport, document synchronization, requests, cancellation, and shutdown.

Protocol:

- `src/protocol.ts` defines completion, Hover, definition, reference, sync, close, status, position, range, result, and error shapes.
- `src/client/api.ts` sends typed requests.
- `src/host/routes.ts` validates and dispatches them.

This is the reference split for a feature that combines CodeMirror interaction with a language server or cross-file semantic engine.

## Framework and ecosystem placement

`src/host/frameworks/` and `src/host/ecosystems/` currently contain conventions only. There is no shipped provider or general Client registry for either category.

- A framework provider must depend on and reuse an existing language provider/session rather than launching a duplicate language service.
- An ecosystem provider may recognize project files or integrate a toolchain, but it must reuse workspace, lifecycle, security, and managed-process boundaries.
- Neither category may create another editor, file tree, terminal, unrestricted command runner, or authentication path.
- Browser presentation for a future framework or ecosystem feature must use an actual existing Client extension point. Do not create a visually symmetric `src/client/frameworks/` or `src/client/ecosystems/` tree unless the first concrete independently registered module proves the need and the project convention is updated.

## Placement examples

| Requested capability | Placement |
| --- | --- |
| JavaScript syntax highlighting or current-document snippets | `src/client/languages/javascript/` plus the existing language registry if dedicated behavior is needed |
| TypeScript project-aware definition lookup | Client interaction plus protocol/API bridge and a Host language provider that owns the semantic engine |
| FastAPI route knowledge backed by Python semantics | Host framework provider reusing the Python capability; Client only renders results through shared UI |
| Maven project discovery or dependency model | Host ecosystem module using workspace-safe inspection and, only if required, managed subprocess services |
| Generic bracket wrapping for every language | Shared `src/client/editor/` extension, not a concrete language module |
| HTML tag closing | HTML Client feature, not shared editor behavior and not a Host service |

## Integration checklist by capability

### Browser-local language feature

1. Add or extend `src/client/languages/<slug>/index.ts` and real `features/*.ts` files.
2. Register or resolve it through `src/client/languages/index.ts`.
3. Reuse the shared editor extension pipeline and compartments.
4. Add flat focused tests plus language registry and sibling-isolation coverage.

### New Client/Host semantic action

1. Define serializable request/result and stable error/status types in `src/protocol.ts`.
2. Add a typed call in `src/client/api.ts`.
3. Validate untrusted input and dispatch it in `src/host/routes.ts`.
4. Implement capability ownership in the relevant Host provider and shared manager only where genuinely common.
5. Bind the browser request to tab/document revision, cancellation, cleanup, and stale-result rejection.
6. Test protocol validation, workspace containment, semantic behavior, failure, cancellation, teardown, and Client isolation.

### New setting

1. Add the shared interface, default, and defensive resolver in `src/settings/schema.ts`.
2. Mirror it in the DSH schema in `src/config.ts`, using volatility only when live Host/plugin behavior requires it.
3. Add accepted mutation/state behavior in `src/client/settings/editor-settings.ts`.
4. Add localized UI only when the requirement calls for a user control.
5. Ensure missing or malformed older configuration resolves safely and rejected writes preserve the last accepted behavior.

## Non-negotiable boundaries

- Do not place Node imports, filesystem access, executable discovery, or subprocess handling in the Client bundle.
- Do not place React, CodeMirror, DOM, or native-tab presentation objects in the Host bundle.
- Do not pass runtime objects through `src/protocol.ts`; use bounded JSON-safe data.
- Do not trust paths, roots, revisions, or content sizes solely because the Client sent them.
- Do not create a second route, provider manager, language registry, editor, or save path when the existing boundary can be extended safely.
- Do not expose new internal tool paths, environment details, or raw process errors to browser users; preserve the existing authorized file-identity protocol where the editor already requires it.
- Do not claim a framework/ecosystem registry exists merely because reserved directories exist.
- Do not move stable modules solely to match an idealized template.
