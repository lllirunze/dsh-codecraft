# Release Guidelines

Use this convention for every DSH CodeCraft Git tag and GitHub Release.

## Version Consistency

Before creating a release, confirm that the following values are identical:

- `package.json` version;
- root package versions in `package-lock.json`;
- the current version heading in `CHANGELOG.md`;
- Git tag in the form `vX.Y.Z` or `vX.Y.Z-prerelease.N`;
- GitHub Release title and Markdown heading.

Run `npm run check` before tagging. A GitHub Release must target the validated commit on `master`; publishing the Release triggers the npm workflow.

For a release candidate such as `0.2.1-rc.0`, publish a GitHub Pre-release and use the npm `rc` dist-tag. A pre-release must not move npm's `latest` tag.

## Release Note Format

The Release title must contain only the version tag:

```text
vX.Y.Z[-prerelease.N]
```

The description must use this structure:

```markdown
## DSH CodeCraft vX.Y.Z[-prerelease.N]

One short sentence summarizing the release.

- Add or improve one verified behavior
- Fix or refactor one verified area
- Document another material change
```

Formatting rules:

- Write Release notes in English.
- Use one summary sentence followed by three to six concise bullets.
- Start bullets with direct verbs such as `Add`, `Fix`, `Improve`, `Refactor`, or `Support`.
- Combine features and fixes in the same bullet list; do not add category headings.
- Describe only changes included and verified in the tagged commit.
- Do not repeat installation or update commands already documented in the README.
- Omit test counts, compatibility matrices, and implementation detail unless they are material release changes.

## Example

Title:

```text
v0.1.1
```

Description:

```markdown
## DSH CodeCraft v0.1.1

Architecture and platform compatibility update.

- Add Windows support alongside macOS
- Add a lightweight language adapter foundation
- Improve draft restoration and conflict handling
- Refactor editor, renderer, and document state modules
- Add plugin compatibility documentation
```
