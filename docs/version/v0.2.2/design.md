# DSH CodeCraft v0.2.2 Python Intelligence Reliability

| Field | Value |
| --- | --- |
| Status | Implemented; automated validation passed, Desktop acceptance pending |
| Target version | 0.2.2 |
| Baseline | 0.2.1 |
| Release type | Patch |
| Platforms | macOS and Windows |
| Theme | Python Intelligence reliability and Python editing refinement |

## Purpose

v0.2.2 hardens the Python Intelligence capabilities delivered in v0.2.0 through v0.2.1, adds safe Google Style Docstring generation, and makes callable completions ready to invoke. It remains a focused patch: reliability changes must address a reproduced failure, a concrete lifecycle gap found during review, or missing regression coverage.

The verified baseline provides workspace-scoped Pyright sessions, full-document synchronization, semantic completion from unsaved content, stale-revision checks, client-side request abortion, one recovery attempt for an empty member-completion result, macOS and Windows environment discovery, and Python-aware indentation.

Google Style Docstring generation is not an existing v0.2.1 feature. v0.2.2 introduces it explicitly rather than describing it as a regression fix. Signature help and diagnostics remain outside this release.

## Repository Audit

| Area | Existing behavior | v0.2.2 conclusion |
| --- | --- | --- |
| Workspace ownership | `IntelligenceManager` caches one session promise per canonical workspace | Preserve reuse, but retire an idle workspace session after its last document closes |
| Recovery | A transport error restarts the session and replays documents | Add an explicit recovery budget so repeated requests cannot create an unbounded restart loop |
| Completion freshness | The browser aborts on document change and both sides compare revisions | Add deterministic overlapping-request and tab/workspace isolation tests |
| Cancellation | `LspConnection` can send `$/cancelRequest` | Propagate an abandoned HTTP request to the Host completion signal where the Host request lifecycle permits it |
| Document sync | `didOpen`, full-text `didChange`, and `didClose` are implemented | Keep full sync; require monotonic revisions and do not add `didSave` unless server capabilities and a reproduced need justify it |
| Environment discovery | Explicit paths, `.venv`/`venv`, bundled Pyright, and platform-specific PATH order exist | Preserve behavior and add edge-case fixes only after reproduction |
| Editing | Python indentation and triple-quote handling exist; Docstring generation does not | Preserve existing behavior and add syntax-guarded Google Style Docstring generation |
| Failure reporting | Stable unavailable reasons exist, while transport errors may contain bounded stderr | Keep user-facing failures actionable without exposing source, environment values, or unnecessary private paths |

## Required Scope

### P0 requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| REL-01 | Workspace session retirement | Closing the final tracked Python document removes and disposes the matching workspace session without affecting another workspace |
| REL-02 | Bounded recovery | A server failure permits only the defined recovery attempt; repeated failure settles as unavailable instead of spawning indefinitely |
| REL-03 | Request freshness | Late completion from an older revision, tab generation, or workspace is discarded and never reaches the active completion list |
| REL-04 | End-to-end cancellation | Abandoned completion work is cancelled at every available layer and the LSP request receives `$/cancelRequest` when already in flight |
| REL-05 | Document lifecycle | Open, change, close, replacement, and replay preserve unique URI ownership and monotonically increasing document versions |
| REL-06 | Failure isolation | Pyright startup, initialization, protocol, or exit failure never blocks DSH startup, ordinary editing, drafts, or saving |
| REL-07 | Cross-platform regression | Bundled Pyright and interpreter discovery continue to work on native macOS and Windows, including paths with spaces and Unicode |
| REL-08 | Editor regression | Python indentation, triple quotes, Tab/Shift+Tab, completion application, save, auto-save, drafts, and conflicts remain stable |
| REL-09 | Callable completion | Confirming a method, function, or constructor in a clear invocation context adds `()` and places the caret inside when the server did not already provide call syntax |
| REL-10 | Documentation consistency | Version records and the shared intelligence-module convention match the delivered architecture and evidence |
| DOC-01 | Safe trigger | In a Python function, method, or class with no Docstring, typing `"""` in the first statement position and pressing Enter generates one template |
| DOC-02 | Google Style structure | Generated output uses Google Style placeholders for reliably known parameters, return values, and generators without inventing semantics |
| DOC-03 | Editing integration | Generation respects two- or four-space indentation, preserves triple-quote pairing, provides ordered editable placeholders, and is one undoable transaction |

### P1 evidence-gated work

The following items may enter v0.2.2 only with a failing reproduction and a regression test:

- incorrect import, member, or cross-file completion results;
- duplicate or poorly ordered candidates after combining semantic and local sources;
- stale interpreter discovery after a confirmed environment change;
- unsafe or broken custom server launch on a supported platform;
- excessive request volume, CPU use, startup frequency, or editor blocking measured in a real scenario;
- user-facing errors that disclose private path details or fail to identify a known failure class.

### Out of scope

- non-Google Docstring styles, signature help, diagnostics UI, code actions, or AI fixes;
- new languages, frameworks, or ecosystem providers;
- Linux Python Intelligence support;
- a new editor, file tree, terminal, Git, build, or debugger surface;
- incremental LSP edits without evidence that full synchronization is the problem;
- cosmetic relocation of stable files or speculative base classes.

## Reliability Design

### Workspace and document ownership

The canonical workspace remains the session key. A session owns the documents opened through it, while a document is identified by canonical URI and the current editor generation (`tabId`). Closing a superseded generation must not close the newer owner.

After the last owned document closes, the manager must remove the session only if the map still points to that exact session, then dispose it through the normal LSP shutdown path. Concurrent replacement or restart must not let an old cleanup delete a new session. A status-only probe must not leave an unbounded idle process.

### Recovery policy

Initialization and transport recovery must be finite and observable. One operation may perform at most one automatic session replacement. Documents captured from the failed session are replayed once in revision order. If replacement or replay fails, the workspace enters an unavailable state for that operation and no recursive restart occurs.

The existing empty-member recovery remains separately bounded. Recovery state must be cleared only after a successfully initialized session completes useful work; it must not reset merely because a new failed session object was allocated.

### Completion cancellation and freshness

Freshness requires all of the following identifiers to match before a result is shown:

- canonical workspace;
- canonical document URI;
- editor generation (`tabId`);
- document revision;
- active CodeMirror completion context.

Document changes continue to abort the browser completion context. The authenticated Host route should translate request abandonment into an `AbortSignal` when supported by the request surface, pass it through `IntelligenceManager` and `LspSession`, and allow `LspConnection` to send `$/cancelRequest`. Cancellation is not a server failure and must not consume the recovery budget.

Even when cancellation races with a response, revision and ownership checks remain authoritative. A late response may be ignored but must never update the current tab.

### Synchronization contract

v0.2.2 retains full-text `didChange`, which is valid for the current Pyright integration. Revisions increase on document changes and never decrease within one editor generation. Reopening or replacing a document uses a new generation and a fresh `didOpen`. Save remains owned by the conflict-safe file service and does not alter the editor revision by itself.

`didSave` is not added by default: the current client advertises no save notification and completion already operates on synchronized unsaved content. It may be introduced only if capability negotiation and a reproduced defect require it.

### Callable completion application

When Pyright classifies a completion item as a method, function, or constructor, supplies only a plain identifier, and the surrounding syntax indicates a clear invocation, CodeCraft appends `()` and places the caret between the parentheses. Clear contexts are a direct expression statement, a direct member expression, or an expression introduced by `return`, `await`, `yield`, or `raise`. This transformation occurs when the user accepts the item, not while candidates are fetched, and therefore does not change ranking or filtering.

Ambiguous reference contexts deliberately retain the identifier without parentheses. These include assignment values, callback arguments, container members, annotations, import statements, definition and class headers, and decorators. Nested expressions that cannot be classified safely also remain unchanged; the user can type `(` and rely on normal bracket pairing. Server-provided snippets remain authoritative. CodeCraft also preserves additional text edits such as automatic imports, does not duplicate an existing following `(`, and leaves properties, variables, classes, modules, and other non-callable item kinds unchanged.

## Google Style Docstring Design

### Trigger and syntax guards

Generation is Python-only and deliberately narrow. Typing the third quote never generates a template by itself. Generation runs only when the user presses Enter with the caret inside a just-entered triple-double-quote pair and every condition below is true:

- the active document is Python;
- the quotes are in the direct body of a `def`, `async def`, method, or `class`;
- the quote expression is at that body's first statement position and at its body indentation;
- the syntax tree identifies the owning definition conclusively;
- the definition has no existing Docstring.

Blank or comment-only lines before the quote do not count as body statements, but the quote must still be the first string expression in the direct definition body. Decorators belong to the definition and do not affect eligibility.

All other triple-quote input follows ordinary CodeMirror string behavior. No template generation occurs:

- for triple single quotes;
- for prefixed strings such as raw, byte, or f-strings;
- at module scope or in an `if`, loop, `try`, `with`, `match`, lambda, comprehension, or other nested block;
- in comments, assignments, arguments, container literals, annotations, or arbitrary expressions;
- after another real statement such as `pass`, an assignment, or an expression;
- when the caret is not inside the newly entered triple-double-quote pair;
- when the definition already has a Docstring;
- while syntax is too incomplete or ambiguous to identify the owner safely.

Ordinary `'''` and `"""` pairing remains available independently of template generation. The implementation must integrate with the existing close-brackets and Python Enter behavior instead of adding a global key listener or keystroke counter.

| Context after entering `"""` | Enter behavior |
| --- | --- |
| First statement in a function, async function, method, or class body | Generate the Google Style template |
| Module-level string | Insert a normal newline inside the string |
| String assigned to a variable or passed as an argument | Insert a normal newline inside the string |
| String inside a conditional, loop, or other nested block | Insert a normal newline inside the string |
| Later statement in an eligible definition | Insert a normal newline inside the string |
| Existing Docstring, prefixed string, triple single quote, or ambiguous syntax | Preserve normal string behavior |

### Template content

The generated template uses triple double quotes and Google Style only. It contains editable placeholders rather than inferred prose. A function template may include:

- one summary placeholder;
- `Args` entries in signature order;
- `Returns` only for a reliably parsed non-`None` return annotation;
- `Yields` only when generator syntax is identified reliably.

`self` and a reliably identified method-level `cls` are omitted. Positional-only, keyword-only, variadic, defaulted, and annotated parameters must retain their meaningful source order and names. An async function follows the same parameter and return rules. A class receives a summary template; attribute documentation is not invented.

The generator must not fabricate descriptions, behavior, types absent from the signature, exceptions, or a `Raises` section. If a return or generator classification is uncertain, omit that section.

### Transaction and indentation

All inserted text, selection, and snippet placeholders are applied as one editor action so one Undo restores the pre-generation document. Body indentation and continuation indentation use the active two- or four-space setting. Placeholder navigation begins at the summary, continues through generated entries in source order, and leaves the caret in a stable final position.

The feature belongs in `src/client/languages/python/features/docstrings.ts` and is registered through the existing Python editor adapter. Shared editor modules must not import it, and no Host, Pyright, or filesystem call is required.

### Errors and privacy

Public status uses stable reason codes for unsupported platform, missing environment, launch failure, initialization timeout, invalid workspace, and unexpected exit. Cancellation and stale requests are quiet control flow. Error text shown in the editor must not include source text, environment-variable values, credentials, or full private paths when a stable explanation is sufficient.

## Architecture Boundaries

The implementation continues to follow [`intelligence-module-conventions.md`](../../guide/intelligence-module-conventions.md):

- `src/client/editor/` owns CodeMirror completion UI and interaction;
- `src/client/languages/python/` owns Python-specific editor behavior;
- `src/host/intelligence/` owns workspace/session coordination and recovery policy;
- `src/host/lsp/` owns JSON-RPC, document synchronization, cancellation, and process shutdown;
- `src/host/languages/python/` owns interpreter, platform, and Pyright launch policy;
- `src/protocol.ts` contains transport-safe request, result, status, and error contracts.

Shared layers must not import Python editor features. Python modules must not copy shared completion UI or LSP transport. No empty future module directories are added.

The imported proposal refers conceptually to a reusable `BaseIntelligence`. The current repository expresses that shared parent capability through `IntelligenceManager`, protocol contracts, registries, and LSP composition rather than a concrete base class. v0.2.2 preserves this dependency direction and does not add speculative inheritance solely to match a proposed class name.

## Implementation Plan

### Stage A: deterministic reproduction

1. Build a controllable fake LSP/subprocess test seam for delayed responses, crashes, cancellation, and shutdown.
2. Add failing tests for last-document cleanup, overlapping completion, workspace isolation, replay, and repeated failure.
3. Record native macOS and Windows baseline behavior before changing runtime code.

### Stage B: lifecycle and concurrency fixes

1. Add race-safe idle-session removal and disposal.
2. Define and enforce one bounded recovery path without recursive restart.
3. Carry request cancellation through the Host route when possible.
4. Keep stale revision and generation checks on both sides of the transport.

### Stage C: Google Style Docstrings

1. Add syntax-tree tests for valid and invalid trigger locations before implementing generation.
2. Add the Python-specific Docstring extension through the language adapter.
3. Generate only reliable Google Style sections with ordered placeholders.
4. Verify two- and four-space indentation, triple-quote interaction, cursor flow, and one-step Undo.

### Stage D: callable completion application

1. Add editor tests for methods, functions, constructors, caret placement, and additional text edits.
2. Preserve server snippets and suppress parentheses in imports, definitions, decorators, callback references, assignments, arguments, containers, and before an existing call.
3. Confirm properties, variables, and ambiguous nested expressions retain identifier-only insertion.

### Stage E: evidence-gated refinement

1. Reproduce any completion, environment, launch, privacy, or performance issue.
2. Apply the smallest fix in the owning layer.
3. Add a regression test before claiming the improvement.

### Stage F: release validation

1. Run `npm run check` and `npm pack --dry-run --json --ignore-scripts`.
2. Complete native DSH Desktop acceptance on macOS and Windows.
3. Verify cold start, workspace switching, plugin unload, and absence of residual Pyright processes.
4. Update the package version, lockfile, changelog, README status, and validation evidence only after delivered scope is known.

## Definition of Done

v0.2.2 is ready when every P0 requirement has automated evidence; Google Style Docstring generation passes its syntax, content, indentation, placeholder, and Undo contract; callable completions add exactly one pair of parentheses only in clear invocation contexts while ambiguous references remain unchanged; any included P1 fix has a reproduced failure and regression test; macOS and Windows Desktop acceptance passes; no stale completion can cross revision, tab, or workspace boundaries; recovery and process cleanup are bounded; ordinary editing and saving survive all intelligence failures; packaging validation passes; and release notes describe only verified changes.
