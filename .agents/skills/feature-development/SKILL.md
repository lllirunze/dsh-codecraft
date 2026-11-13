---
name: feature-development
description: Implement and coordinate normal versioned feature work in this repository from approved requirements through architecture, code, focused tests, automated regression, and manual DSH Desktop handoff. Use when asked to build or complete a planned version or substantial feature. Do not publish releases without a separate explicit request.
---

# Feature Development

Deliver one requested version or feature with traceable evidence. This skill owns implementation and coordination; specialized skills retain their own responsibilities.

## Determine the requested outcome

- **Design only:** use `version-documentation` for planning analysis, version choice, `design.md`, and `validation.md`; do not modify source.
- **Implement a version or feature:** continue through implementation, focused verification, automated regression, and a manual Desktop checklist. This is the default meaning of “implement” or “complete” a requirement.
- **Resume after manual testing:** record only results the user actually reports, rerun stale automation if code changed, and state readiness accurately.
- **Publish:** use `release-management` only after required automation and manual acceptance pass and the user explicitly asks to commit, push, and tag. Preparation or passing tests is not publication authority.

For a complete version delivery, read [references/version-delivery-gates.md](references/version-delivery-gates.md). For any release candidate or change that can affect plugin loading, activation, configuration, packaging, lifecycle, or DSH integration, also read and apply [local DSH Desktop safety validation](../regression-testing/references/dsh-desktop-safety-validation.md). For a small isolated fix, compress the same reasoning into a short scope/plan/test loop instead of creating unnecessary documents.

## Establish the source of truth

1. Read `AGENTS.md`, inspect `git status`, and preserve all unrelated staged, unstaged, and untracked work.
2. Identify the target version and requirements. Prefer normalized records under `docs/version/vX.Y.Z/`; otherwise use the relevant `docs/planning/` source and apply `version-documentation` before implementation.
3. Treat user requirements and mandatory requirement IDs as scope authority, but resolve file paths, APIs, and feasibility against the checked-out source. Explain stale documentation mappings instead of inventing missing APIs.
4. Read the nearest comparable source modules and tests. Do not assume a proposal, old release, or attached example matches the current architecture.
5. Keep later-version requirements out of the current delivery.

Do not bump `package.json`, write a changelog release entry, add completed README claims, commit, push, or tag during ordinary implementation. Those are release-management responsibilities after validation.

## Create a traceable implementation plan

Before editing, map every in-scope requirement to:

- observable behavior and failure/negative cases;
- actual Client, Host, protocol, settings, or documentation ownership;
- files to add or change and the reason for each;
- focused automated tests;
- native DSH Desktop scenarios that automation cannot prove.

If the work concerns a language, framework, or developer ecosystem, apply `language-module-architecture` before choosing paths. Respect the current Client/Host runtime split and use the smallest existing extension point; do not create parallel registries, routes, editors, save paths, or empty future modules.

Flag only decisions that would materially change scope, security, compatibility, or product behavior. Otherwise make conservative assumptions and proceed.

## Implement the agreed scope

- Follow repository TypeScript style, public contracts, security boundaries, and lifecycle ownership.
- Keep generic editor behavior separate from language-specific behavior. Keep browser code free of Node filesystem/process APIs and Host code free of React, CodeMirror, and DOM objects.
- Reuse the existing save, settings, protocol, intelligence, LSP, and native-tab infrastructure rather than duplicating it.
- Make activation and rendering crash-safe: no uncaught exceptions or unhandled rejections, a scoped error boundary for plugin-owned UI where a render failure could escape, validated settings/protocol/file input, and contained failure for optional services.
- Bound asynchronous work and teardown: abort and discard stale work, cap retries and timeouts, avoid retry or process-respawn loops, and dispose routes, listeners, timers, subprocesses, and slot effects idempotently.
- Preserve ordinary editing and saving when optional assistance is disabled or fails; never clear dirty state, overwrite newer disk content, or bypass checked-save/conflict handling on error.
- Register each route, preview id, slot id, settings id, and process session once; keep the stable plugin identities unchanged by ordinary version bumps.
- Add or update flat Vitest files under `tests/` for success, validation failure, security boundaries, regressions, sibling-module isolation, and the negative safety cases named in the local Desktop safety protocol.
- Do not edit generated `lib/` by hand or weaken assertions to obtain a pass.

Read the implementation rules in [local DSH Desktop safety validation](../regression-testing/references/dsh-desktop-safety-validation.md) before changing activation, lifecycle, settings, routing, or registration code.

When implementation reveals a real requirement or architecture gap, update the plan and affected version documentation truthfully. Do not silently expand the version.

## Verify, fix, and reverify

1. Run the smallest relevant Vitest files during implementation so failures are local and actionable.
2. Run `npm run typecheck` when TypeScript contracts are affected; run build verification when imports, bundles, declarations, configuration, or package artifacts are affected.
3. After the implementation stabilizes, apply `regression-testing` for impact-based automated verification. A full version, shared setting, lifecycle, Host/protocol, file-safety, or cross-module change normally requires `npm run check`.
4. Feature development owns fixing in-scope implementation defects. After a fix, rerun the affected focused checks and every broader result invalidated by that code change.
5. Record exact commands, results, test counts, build evidence, failures, and environmental limitations. A command not run is not a pass.

Update `docs/version/vX.Y.Z/validation.md` only with evidence actually produced. Leave native Desktop items unchecked until the user reports observed results. Do not let a library capability, unit test, or screenshot stand in for product integration evidence.

## Validate the local Desktop candidate safely

For a completed version and for changes to package metadata, entry points, `cordis.patch.yml`, Host/Client integration, settings, persistence, routes, slots, lifecycle, or dependencies, apply the local DSH Desktop safety protocol after automated regression and before native acceptance:

1. Record the candidate Git SHA, package version, running DSH version, profile, and expected installation source.
2. Require current `npm run check` evidence and inspect `npm pack --dry-run --ignore-scripts --json`; source-tree success alone does not prove the published package is complete.
3. Preserve the stable package, Loader row, Host, Client, preview, and route identities. Treat any requested identity change as an explicit compatibility migration, not a routine version bump.
4. Keep exactly one CodeCraft source selected in the Desktop profile. Never combine an npm installation with the local link or hand-edit profile package/patch files.
5. Installing or replacing the local Bundle is a profile mutation and requires explicit user authorization. When authorized, use DSH Plugin Manager with the repository's absolute path, verify the receipt and exact link target, and leave unrelated profile configuration untouched.
6. After replacing loaded Host or Client code, require a full DSH Desktop restart. HMR, an unchanged Slot id, or a successful build is not proof that the candidate generation is running.
7. Inspect the active Host row, Config schema and `packageDir`, Client Slot registrations, and authenticated route fence after application and again after restart. A duplicate registration, failed fiber, wrong package source, generic route 404, or candidate-attributable startup/crash report blocks handoff.
8. Hand native startup, open/edit/save, settings, exit, and restart smoke checks to the user together with the change-specific acceptance matrix.

A version-only metadata change may retain earlier behavioral acceptance only when no behavior or runtime contract changed, but it still requires refreshed check, packed-artifact identity, installed-version, and startup/open smoke evidence. If profile mutation is not authorized, mark the local application portion `BLOCKED` or `NOT VERIFIED`; do not bypass or silently weaken it.

## Hand off manual experience testing

After automation passes, explicitly tell the user that AI-driven implementation and regression are complete and manual DSH Desktop testing is required. Provide a concise checklist derived from the version validation record and changed behavior, including applicable:

- startup, open/edit/save/close/reopen, dirty state, Undo/Redo, and native-tab behavior;
- the new positive, negative, disabled, failure, and persistence cases;
- interaction with unaffected HTML, Java, and Python modules;
- paths with spaces and Chinese characters, offline behavior, and optional-runtime absence;
- independent macOS and Windows checks when both are in scope.

Do not claim manual success for the user. If they report a defect, return to the earliest affected implementation or design step, fix it, and invalidate dependent evidence.

## Finish with a delivery report

State:

- target version and delivered scope;
- requirement coverage and intentional exclusions;
- architecture and files changed;
- focused and regression commands with results;
- validation document status;
- manual checks still required or user-confirmed outcomes;
- blockers, known limitations, and the next owner/action.

Never present a design as implemented, automation as native acceptance, release readiness as publication, or old test evidence as current after code changes.
