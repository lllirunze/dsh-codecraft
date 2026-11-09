---
name: release-management
description: Finalize and publish a validated repository version by synchronizing release metadata, committing and pushing master, creating and pushing the matching Git tag, and drafting GitHub Release content. Use only after npm checks and required manual acceptance pass and the user explicitly asks to execute the release. Do not use for requirements design or validation planning.
---

# Release Management

Publish an already implemented and accepted version through the repository's Git workflow. This skill performs external mutations; a request to inspect, prepare, or review a release does not authorize commit, push, or tag creation. Proceed without another confirmation only when the user has clearly asked to execute and push the release.

## Preconditions

1. Read `AGENTS.md`, `docs/guide/releasing.md`, the target `docs/version/.../design.md` and `validation.md`, `package.json`, `package-lock.json`, `CHANGELOG.md`, and both root README files.
2. Determine the target version from the approved version record. Accept only:

   ```text
   ^\d+\.\d+\.\d+(?:-[a-z][a-z0-9-]*\.\d+)?$
   ```

   The first prerelease for a label uses `.0`. Preserve the complete suffix in every release identifier, for example `0.4.0-rc.0` and `v0.4.0-rc.0`.
3. Require successful `npm run check` evidence and completed manual acceptance for every required platform. Release-execution items such as creating the tag may remain unchecked because this workflow completes them. Stop if any product requirement or required acceptance item remains incomplete.
4. Confirm the current repository is on `master`, the configured `origin` is the intended GitHub repository, and the worktree contains only changes that belong to the target release. Never merge another branch, discard user changes, or include ambiguous unrelated files without user direction.

## Publish in order

### 1. Finalize the version, commit, and push `master`

- Compare the target version with `package.json`, the root package entries in `package-lock.json`, the current `CHANGELOG.md` heading, version documentation, and README release claims.
- If metadata still contains the previous version, update the required files to the target version before committing. Keep the package version, lockfile root versions, changelog version, and documented release identity consistent.
- Run `npm run check` after the final metadata update, followed by `git diff --check`. Stop on any failure.
- Fetch `origin` and verify that local `master` is not behind or diverged from `origin/master`. Do not automatically rebase, merge, or force-push a release branch.
- Review `git status` and the complete diff. Stage only implementation, tests, and documentation belonging to this release. Do not use broad staging when unrelated user changes are present.
- Create one focused Conventional Commit appropriate to the release and push it with:

  ```bash
  git push origin master
  ```

- Verify that `origin/master` resolves to the release commit before tagging.

### 2. Create the Git tag

Build the tag by prefixing the exact version with `v`:

```text
0.4.0          -> v0.4.0
0.4.0-alpha.0  -> v0.4.0-alpha.0
0.4.0-beta.0   -> v0.4.0-beta.0
0.4.0-rc.0     -> v0.4.0-rc.0
```

Check both local and remote tags before creation. If the tag exists and points elsewhere, stop; never delete, move, or force-update a release tag. Create an annotated tag on the verified release commit:

```bash
git tag -a vX.Y.Z[-label.N] -m "vX.Y.Z[-label.N]"
```

### 3. Push the tag

Push only the new release tag:

```bash
git push origin vX.Y.Z[-label.N]
```

Verify the remote tag resolves to the same release commit as `origin/master`. Never use `--force` or `--tags` for this workflow. If a remote operation fails after an earlier step succeeded, preserve the completed state, report it precisely, and resume only the incomplete safe step.

### 4. Return GitHub Release content

After the branch and tag are confirmed, read [references/release-content-example.md](references/release-content-example.md). Return:

- the pushed release commit;
- confirmation that `master` and the exact tag were pushed;
- the GitHub Release title, which is exactly the tag;
- an English Markdown body with `## DSH CodeCraft <tag>`, one concise summary sentence, and three to six direct-verb bullets describing only verified changes.

Do not create the GitHub Release unless the user separately asks for that external action. For a prerelease, tell the user to mark it as a GitHub Pre-release and follow the repository's configured prerelease npm dist-tag policy.
