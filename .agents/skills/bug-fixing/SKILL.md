---
name: bug-fixing
description: Diagnose and fix defects in existing dsh-codecraft behavior from user-reported black-box symptoms, errors, crashes, regressions, failed loading, unresponsive operations, and platform-specific failures. Establish evidence, identify the root cause, apply the smallest safe correction, and verify it. Do not use for new feature development, standalone regression requests, or releases.
---

# Bug Diagnosis & Resolution

Resolve failures in existing behavior without turning them into feature-development projects. Treat the user's observed symptom as evidence of a defect, not as a confirmed cause.

## Scope and routing

- Use this skill for incorrect or previously working behavior, crashes, errors, no-op interactions, plugin loading failures, regressions after a change, configuration failures, and macOS/Windows differences.
- Use `feature-development` for new capabilities and explicitly requested functional enhancements. A defect discovered while implementing an active feature may remain within that feature workflow; an independently reported defect in existing behavior belongs here.
- Use `regression-testing` alone when the user requests verification without diagnosis or repair. Apply its relevant checks after a repair stabilizes.
- Use `release-management` only for a separately authorized release. A bug report never authorizes a version bump, commit, push, tag, npm publication, or GitHub Release.
- If the user requests diagnosis only, investigate and report without changing code.

## Model the failure

1. Extract expected behavior, actual behavior, reproduction actions, affected scope, environment and version, and any preceding change.
2. Separate user-observed facts, verified repository facts, working hypotheses, and missing information. Ask only for information that materially blocks safe progress.
3. Read `AGENTS.md`, relevant source and tests, and `git status`. Preserve unrelated staged, unstaged, and untracked work, user configuration, data, and unsaved editing state.

## Localize with evidence

1. Trace the smallest plausible path from the trigger through event handling, state, Client/Host boundaries, persistence or external dependencies, and the visible result.
2. Inspect relevant errors, logs, configuration, recent diffs, tests, lifecycle behavior, and platform-specific paths. Expand the search only when evidence justifies it.
3. Keep multiple explanations open until evidence excludes them. A configuration, compatibility, dependency, or environment problem may require guidance rather than a code change.

For a platform difference, first distinguish path syntax, permissions, process behavior, executable discovery, file locking, line endings, and lifecycle before proposing a shared-code correction.

## Reproduce and confirm the cause

- Prefer a minimal reproduction and a focused failing test or deterministic diagnostic when practical.
- Explain how the call chain, state transition, error, or test demonstrates the cause. Classify the conclusion as `confirmed`, `strongly inferred`, or `unconfirmed`.
- Do not confuse correlation with cause or repeatedly change code until the symptom disappears.
- If the required Desktop, platform, dependency, credentials, or data are unavailable, state the limit as `NOT VERIFIED`; never invent reproduction or success evidence.

## Apply the smallest safe correction

- Fix the cause rather than hiding it with silent catches, disabled checks, blanket resets, arbitrary delays, or unbounded retries.
- Change only what the defect requires. Preserve module boundaries, public contracts, ordinary editing and saving, unsaved buffers, checked-save semantics, file/tree/tab synchronization, settings, and Host lifecycle.
- Add no unrelated feature or opportunistic refactor. If a broader change is genuinely required, explain why the smaller correction is insufficient and identify its impact before proceeding.
- Follow the repository's TypeScript and test conventions. Do not edit generated `lib/` by hand or weaken assertions to manufacture a pass.
- Obtain explicit authority before destructive operations, profile mutation, permission expansion, user-data migration, version changes, Git writes, or publication.

## Verify the repair

1. Re-run the original failure path first and record the observed result.
2. Add or update a focused regression test for a confirmed defect when feasible. The test should exercise the failure mechanism, not merely the new implementation shape.
3. Load and apply `regression-testing` after the fix stabilizes. Select focused, integration, platform, packaging, and Desktop checks from the actual impact; do not force the full feature-delivery gate for every local defect.
4. After any correction, rerun every result invalidated by that change. Distinguish `PASS`, `FAIL`, `BLOCKED`, `NOT VERIFIED`, and `NOT APPLICABLE` using actual evidence.
5. Platform-specific claims require evidence from that platform. Automated checks do not prove native DSH Desktop interaction.

## Report the outcome

Include:

- the original symptom and affected conditions;
- the root cause and evidence level, or remaining uncertainty;
- changed files and how the correction addresses the cause;
- exact automated commands and manual scenarios actually run, with results;
- unverified areas and residual risk;
- confirmation that version, Git history, and release state were unchanged unless separately authorized.

Do not claim the defect is fixed until direct evidence supports it. If blocked, provide the strongest supported diagnosis and the next reproducible verification step.
