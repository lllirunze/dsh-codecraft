# Version Delivery Gates

Use these gates for a complete planned version. They are evidence checkpoints, not reasons to create extra process files or stop between every step when the next action is safe and authorized.

## Gate sequence

| Gate | Required evidence | Owner or applied skill | Exit condition |
| --- | --- | --- | --- |
| G0 Scope | Target version, requested outcome, platforms, explicit exclusions | Feature development | Scope is clear enough to proceed without changing product intent |
| G1 Requirements | Normalized English `design.md`, requirement IDs, observable behavior, failure cases, `validation.md` plan | `version-documentation` | Every mandatory item is testable and later-version work is excluded |
| G2 Architecture | Current-code investigation, requirement-to-file plan, Client/Host ownership, settings/protocol/lifecycle impacts, test mapping | Feature development; `language-module-architecture` when applicable | The smallest feasible design uses real repository extension points |
| G3 Implementation | Source changes, focused tests, exact focused command results | Feature development | In-scope behavior exists and focused checks pass or blockers are explicit |
| G4 Regression | Impact scope, exact commands, PASS/FAIL/INCOMPLETE, unverified areas | `regression-testing` | Required automation passes on the current code revision |
| G5 Native acceptance | DSH Desktop steps and user-observed results per required platform | User with agent-provided checklist | Required manual cases pass; untested cases remain visibly unverified |
| G6 Release handoff | Complete evidence, no critical blocker, release work explicitly requested | `release-management` | Version metadata, commit, push, and tag follow the separate authorized workflow |

Ordinary implementation stops at G5 handoff until the user returns manual results. Do not enter G6 merely because `npm run check` passes.

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

Do not use `PASS` for planned work, inferred platform compatibility, a command that is still running, or validation performed before the latest relevant code change.

## Backtracking and stale evidence

- Requirement changes invalidate affected architecture, implementation, automated cases, and manual cases.
- Architecture changes invalidate affected code and test assumptions.
- Production or test-code changes after G4 invalidate relevant automated results.
- Behavior changes after G5 invalidate relevant manual results.
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
```

Read `package.json` before execution because scripts may evolve. `npm run check` currently runs typecheck, the full Vitest suite, build, and artifact verification in CI order. It does not establish real DSH Desktop behavior.

## Manual acceptance record

For each required platform, capture only facts the user supplies:

```text
Platform and DSH version:
Scenario:
Expected result:
Observed result:
Status: PASS | FAIL | NOT VERIFIED
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
Manual status by platform:
Known risks or blockers:
Current gate:
Next action and owner:
```
