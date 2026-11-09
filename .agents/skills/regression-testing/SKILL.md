---
name: regression-testing
description: Plan, execute, and report regression tests for this repository with its existing npm, Vitest, typecheck, build, and verification commands, then hand off scoped DSH Desktop experience checks. Use when asked to test, retest, verify, or audit current behavior. Do not implement fixes or publish releases.
---

# Regression Testing

Test the checked-out repository and report observable evidence. This skill is independent of where testing occurs in a development process; select checks from the actual change and risk, not from a presumed workflow stage.

## Protect the workspace

- Read `AGENTS.md` and `package.json` before choosing commands. Treat them as authoritative because scripts and supported environments may change.
- Inspect the user's stated scope plus staged, unstaged, and untracked changes. State the Git baseline used; default to `HEAD` when the user supplies none.
- Record `git status --short` before and after testing. Never reset, clean, stash, revert, or overwrite user changes. Do not edit generated `lib/` by hand.
- Do not run `npm ci`, install packages, modify tests, or change production code unless the user separately asks for that action. If required local dependencies are missing, report the affected checks as blocked.
- Regression testing authorizes local read-only diagnostics and repository test/build commands. It does not authorize DSH installation changes, commits, pushes, tags, releases, or npm publication.

## Select coverage from impact

Read [references/project-test-map.md](references/project-test-map.md) whenever mapping changed code to focused tests or preparing the manual handoff.

1. Identify affected behavior, shared callers, settings, persistence, file safety, language isolation, Host/client boundaries, platform branches, and package entry points.
2. Run the smallest relevant Vitest files first when they can localize a failure.
3. For a general regression request, completed feature, cross-module change, file-safety change, lifecycle change, settings change, or packaging change, run the full repository gate:

   ```bash
   npm run check
   ```

   This is the canonical combined typecheck, test, build, and artifact verification command in the current repository.
4. For a genuinely narrow diagnostic request, focused tests and `npm run typecheck` may be sufficient if the user limited the scope. State clearly that the full gate was not run.
5. Do not run redundant commands merely to increase the command count. If `npm run check` passes, its four component commands are already covered. If it fails, use the failing component or focused test to isolate the cause.

Only claim coverage for behavior that actually ran. Automated tests do not prove native DSH Desktop behavior, settings persistence across a real restart, OS UI integration, or macOS/Windows compatibility.

## Execute and communicate

- Before execution, tell the user the detected scope, selected commands, and why they are relevant.
- During execution, keep the user updated. After each completed command, report `PASS`, `FAIL`, or `BLOCKED` with concise evidence such as failing test names, test-file/test counts, build verification output, or the blocking dependency.
- Preserve the exact command and exit result. Do not describe a command as passed while it is still running or after code changed subsequently.
- When a failure occurs, distinguish a likely regression, an existing failure, an environment/tooling limitation, or an unresolved cause. Gather a minimal reproduction with existing commands, but do not alter assertions or production code to make the result green.
- Continue with independent safe checks when they still add evidence. Avoid repeating the same failing command without a reason.

## Final report and manual handoff

End with a self-contained report in the user's language:

1. **Automated conclusion:** `PASS`, `FAIL`, or `INCOMPLETE`, scoped to the evidence.
2. **Scope and baseline:** changed behavior and comparison point.
3. **Commands:** exact command, result, and key evidence for each.
4. **Findings:** regressions, warnings, or no automated regression found.
5. **Not automated:** Desktop, platform, persistence, offline, or interaction areas that commands could not establish.
6. **Manual experience testing:** explicitly tell the user that AI-driven automated regression is complete and manual DSH Desktop testing is still required. Provide a short, change-specific checklist from the reference map and relevant `docs/version/.../validation.md` record.

Never mark manual acceptance as passed on the user's behalf. If automated checks pass, say that the user can now begin manual experience testing. If they fail, tell the user to resolve and rerun the automated failures before treating manual acceptance as final, while still listing the eventual manual scenarios.
