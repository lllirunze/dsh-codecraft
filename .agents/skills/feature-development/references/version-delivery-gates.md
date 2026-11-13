# Version Delivery Gates

Use these gates for a complete planned version. They are evidence checkpoints, not reasons to create extra process files or stop between every step when the next action is safe and authorized.

Read [local DSH Desktop safety validation](../../regression-testing/references/dsh-desktop-safety-validation.md) before a release candidate and whenever the change affects package metadata, build output, entry points, Cordis configuration, Host/Client integration, settings, persistence, routes, slots, lifecycle, or dependencies.

## Gate sequence

| Gate | Required evidence | Owner or applied skill | Exit condition |
| --- | --- | --- | --- |
| G0 Scope | Target version, requested outcome, platforms, explicit exclusions | Feature development | Scope is clear enough to proceed without changing product intent |
| G1 Requirements | Normalized English `design.md`, requirement IDs, observable behavior, failure cases, `validation.md` plan | `version-documentation` | Every mandatory item is testable and later-version work is excluded |
| G2 Architecture | Current-code investigation, requirement-to-file plan, Client/Host ownership, settings/protocol/lifecycle impacts, test mapping | Feature development; `language-module-architecture` when applicable | The smallest feasible design uses real repository extension points |
| G3 Implementation | Source changes, focused tests, exact focused command results | Feature development | In-scope behavior exists and focused checks pass or blockers are explicit |
| G4 Regression | Impact scope, exact commands, `PASS`/`FAIL`/`INCOMPLETE`, packed-artifact identity when packaging is in scope, and unverified areas | `regression-testing` | Required automation and package inspection pass on the current code revision |
| G4b Local Desktop candidate | Candidate SHA and version, DSH version and profile, explicit authorization, Plugin Manager receipt, exact link or npm source, required restart, Host row/Config/`packageDir`, Client registrations, route fence, and no fresh candidate crash | `regression-testing` with `feature-development`; profile mutation requires explicit user authorization | Candidate is live from the expected source with no activation failure, or the gate is explicitly `BLOCKED`/`NOT VERIFIED` |
| G5 Native acceptance | DSH Desktop startup, open/edit/save, settings, normal exit and restart smoke, plus user-observed results for the change-specific matrix per required platform | User, with an agent-provided checklist | Required manual cases pass; untested cases remain visibly unverified |
| G6 Release handoff | Complete evidence, no critical blocker, release work explicitly requested | `release-management` | Version metadata, commit, push, and tag follow the separate authorized workflow |

Ordinary implementation stops at G5 handoff until the user returns manual results. Do not enter G6 merely because `npm run check` passes. G4b is a verification gate, not installation authority: if profile mutation was not authorized, record it as `BLOCKED` or `NOT VERIFIED` and do not present G5 as ready.

## Requirement traceability

Maintain the mapping in the existing version design/validation documents rather than creating a new workflow file unless the user requests one:

```text
Requirement ID
  -> observable behavior and negative case
  -> actual source modules/files
  -> focused automated evidence
  -> regression evidence
  -> Desktop acceptance case and platform
  -> current status
```

Use the requirement IDs already present in the planning source, such as `HTML-040-01`. Do not replace stable source IDs with generic `AC-01` labels unless the source has no IDs and a stable identifier is genuinely needed.

## Gate states

Use evidence-safe states:

- `PASS`: the named check actually ran or the behavior was actually observed and succeeded.
- `FAIL`: the named check or behavior ran and failed.
- `BLOCKED`: execution could not proceed because of a concrete missing dependency, environment, permission, or required decision.
- `NOT VERIFIED`: a required manual or external scenario has not been observed.
- `NOT APPLICABLE`: the case is outside the approved scope, with a short reason.

A multi-check conclusion may be reported as `INCOMPLETE` when some required checks are `BLOCKED` or `NOT VERIFIED`; each individual item still uses one of the five states above.

Do not use `PASS` for planned work, inferred platform compatibility, a command that is still running, or validation performed before the latest relevant code change.

## Backtracking and stale evidence

- Requirement changes invalidate affected architecture, implementation, automated cases, and manual cases.
- Architecture changes invalidate affected code and test assumptions.
- Production or test-code changes after G4 invalidate relevant automated results.
- Package metadata, entry point, build, manifest, patch, dependency, or supported DSH-version changes invalidate package identity, local candidate application, and Desktop activation evidence.
- Replacing loaded Host or Client code invalidates runtime registration, restart, and native experience evidence.
- Behavior changes after G5 invalidate relevant manual results.
- A version-only release-metadata change may retain earlier behavioral acceptance only when no behavior or runtime contract changed; refresh the check, packed-artifact identity, installed version, and startup/open smoke.
- Documentation-only clarification does not automatically invalidate behavior evidence, but release metadata changes still follow repository release checks.
- Fix the earliest affected layer, then rerun only the dependent evidence plus broader safety checks justified by the risk.

## Project-specific implementation evidence

The current repository uses:

```text
npx vitest run tests/<module>.test.ts
npm run typecheck
npm test
npm run build
npm run verify
npm run check
npm pack --dry-run --ignore-scripts --json
```

Read `package.json` before execution because scripts may evolve. `npm run check` currently runs typecheck, the full Vitest suite, build, and artifact verification in CI order. `npm pack --dry-run --ignore-scripts --json` inspects the package identity and files npm would publish. Neither command establishes real DSH Desktop behavior.

## Manual acceptance record

For each required platform, capture only facts the user supplies:

```text
Candidate version / Git SHA:
DSH Desktop version and platform:
Installation source:
Scenario:
Expected result:
Observed result:
Status: PASS | FAIL | BLOCKED | NOT VERIFIED
Failure or degradation notes:
```

If the user reports “validation passed” for the complete version matrix, record that confirmation without inventing device models, screenshots, logs, or commands they did not provide.

## Handoff summary

Keep the cross-skill handoff compact:

```text
Version / baseline:
In-scope requirement IDs:
Changed modules and files:
Architecture decisions:
Automated commands and results:
Desktop candidate / DSH version / install source:
Manual status by platform:
Known risks or blockers:
Current gate:
Next action and owner:
```
