---
name: version-documentation
description: Analyze planned requirements, plan version numbers, and create or revise normalized English design and validation records. Use for work from docs/planning to docs/version. Do not use for implementation, package-version updates, commits, pushes, tags, or release publication.
---

# Version Documentation

Turn raw future-version requirements into repository-aligned, evidence-safe version documentation.

## Sources and destinations

- Treat `docs/planning/` as the source for future release requirements and proposals. Search it for the target version and read every directly relevant document before drafting.
- Preserve planning files as raw inputs unless the user explicitly asks to move or remove them. This directory may be intentionally ignored by Git.
- Treat the version declared by the relevant planning document as authoritative. Do not silently substitute a different release number.
- Write normalized records to `docs/version/vX.Y.Z/` or, for a prerelease, `docs/version/vX.Y.Z-<label>.<number>/`.
- Create or update both `design.md` and `validation.md` in that directory.
- Update the repository's canonical version index after both files exist. In the current repository this is `docs/README.md`; do not create a competing `docs/version/README.md` unless the repository convention changes.
- Write the skill and every generated version document in English. Localized product strings may appear as quoted requirements when relevant.

## Version rules

Use three numeric components: `MAJOR.MINOR.PATCH`.

When choosing a version or explaining why a planned scope has a particular number, read [references/version-number-example.md](references/version-number-example.md). It provides the canonical naming example, component meanings, zero-based starts, and prerelease progression used by this repository.

- Increment `MAJOR` for broad whole-project implementation, architectural redesign, or large-scale refactoring.
- Increment `MINOR` for delivery of a distinct feature or capability.
- Increment `PATCH` for an addition, refinement, compatibility change, or bug fix to an existing feature.

All newly introduced numeric sequences are zero-based: their first value is `0`, not `1`. Apply that rule consistently when designing a version:

- if a project has no established version or planning baseline, begin at `0.0.0`;
- a new major line starts at `X.0.0`;
- a new minor feature line starts at `X.Y.0`;
- a patch release increments the existing patch component because it continues an established sequence rather than starting a new one;
- the first prerelease for a label starts at `.0`, and later iterations increment to `.1`, `.2`, and so on;
- when changing prerelease labels, the new label starts its own sequence at `.0`, for example `alpha.0` followed later by `beta.0`.

Use the planning document's version when it provides one. Check that its scope agrees with the category above and flag a material mismatch instead of renumbering silently.

Add a prerelease suffix only when the planning requirement calls for one. The suffix must contain a lowercase English label followed by a dot and a numeric sequence, for example:

- `0.4.0-alpha.0`
- `0.4.0-beta.0`
- `0.4.0-rc.0`
- `1.0.0-preview.0`

Accept other meaningful lowercase labels, but require the final `.number` and begin a new label at `.0`. Reject bare or ambiguous forms such as `0.4.0-alpha`, `0.4.0-rc`, `0.4.0-rc1`, or `0.4.0-beta-x`. A suitable syntax-validation pattern is:

```text
^\d+\.\d+\.\d+(?:-[a-z][a-z0-9-]*\.\d+)?$
```

If a planning document contains an invalid or conflicting version and the missing value cannot be inferred without guessing, report the issue and request correction before choosing the destination directory.

## Analyze before drafting

1. Read the repository `AGENTS.md`, `docs/README.md`, the target planning documents, and the nearest comparable records under `docs/version/`.
2. Inspect the current implementation, dependencies, tests, and long-lived guides relevant to the requested capability. Distinguish what already exists from what the release must add.
3. Preserve every mandatory requirement ID, acceptance rule, failure case, platform constraint, and explicit exclusion from the planning source.
4. Resolve planning terminology against the actual repository structure. Use real module boundaries and public APIs; explain a necessary path mapping instead of copying a stale path or inventing an API.
5. Keep the target release isolated from requirements assigned to later versions.

Do not claim a library capability proves product integration. Do not invent policy, API availability, implementation results, test outcomes, or Desktop acceptance.

## Write `design.md`

Adapt the structure to the release while normally covering:

- title and metadata with status, target, baseline, release type, platforms, and scope;
- purpose and current-baseline analysis;
- a complete requirement matrix preserving the source IDs;
- user-visible behavior and exact settings or commands where specified;
- architecture, module ownership, runtime boundaries, and data or settings flow;
- failure handling, activation/error boundaries, optional-service degradation, crash-safe teardown, lifecycle, security, offline behavior, and language or feature isolation;
- explicit out-of-scope boundaries;
- an implementation sequence grounded in the current codebase;
- a definition of done that includes all mandatory requirements.

For a new record, use a truthful status such as `Design baseline; implementation and validation pending`. Do not mark planned behavior implemented or validated.

## Write `validation.md`

Create a planned evidence record tied to `design.md` and the same baseline. It should normally include:

- evidence rules;
- requirement traceability when the release has numbered requirements;
- focused automated checks for behavior, validation failures, lifecycle, safety, and regressions;
- candidate identity, packed-artifact inspection, authorized local Bundle application, required restart, Host/Client/route activation, and crash/exit/restart smoke following [local DSH Desktop safety validation](../regression-testing/references/dsh-desktop-safety-validation.md);
- independent macOS and Windows DSH Desktop acceptance when both platforms are in scope;
- offline, packaging, dependency, and documentation checks where relevant;
- a release gate describing conditions that block release.

Leave every new checklist item unchecked. Use `- [ ]`, never `- [x]`, until the named evidence has actually been produced. Planned commands such as `npm run check` are checklist items, not claims that they passed.

## Documentation boundaries

- Add the version to the canonical documentation index with links to both files and a summary that clearly says `Planned` while implementation or acceptance remains incomplete.
- Stop after requirements, version planning, design, validation planning, and documentation-index work.
- Do not update package or lockfile versions, changelog release entries, release headings, commits, remote branches, or tags.
- Do not add completed feature claims to root README files. Those claims belong to post-implementation release work after validation.
- Route an explicit request to commit, push, tag, or publish a validated version to the separate `release-management` skill.

## Verify the result

- Confirm both destination documents exist and their relative links resolve.
- Confirm every planning requirement ID appears in the design and is covered by validation evidence.
- Confirm the version directory and metadata use the same valid version string, including any prerelease suffix.
- Search for accidental completed checkboxes or unsupported `implemented`, `validated`, or `passed` claims.
- Check English-only prose, Markdown consistency, trailing whitespace, `git diff --check`, and the final worktree diff.
- Run code tests only when code or build behavior changed; for documentation-only work, report that tests were not run and state the documentation checks performed.
