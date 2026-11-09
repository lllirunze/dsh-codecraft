# Version Number Naming Example

Use this example when selecting or explaining a planned version. The planning document remains authoritative when it already declares a valid version.

## Stable version example: `0.4.0`

The name has three numeric components:

```text
0.4.0
│ │ └─ PATCH
│ └─── MINOR
└───── MAJOR
```

| Component | Example value | Meaning |
| --- | --- | --- |
| `MAJOR` | `0` | The project is in major line `0`. A later broad whole-project redesign, large architectural replacement, or similarly large implementation may advance the major line, such as `1.0.0`. |
| `MINOR` | `4` | This release belongs to minor feature line `4`. A distinct new capability advances the established minor sequence, while the patch component resets to `0`. |
| `PATCH` | `0` | This is the starting release of the `0.4` feature line. A compatible correction or incremental enhancement to this established feature line advances it to `0.4.1`, then `0.4.2`. |

For example, an offline HTML editing foundation is a distinct capability rather than a correction to an existing feature, so `0.4.0` is an appropriate minor feature version when the prior release is in the `0.3.x` line.

The numbers are identifiers for established sequences, not counts of documents or requirements. New numeric sequences start at `0`:

- a new project with no baseline starts at `0.0.0`;
- a new major line starts at `X.0.0`;
- a new minor line starts at `X.Y.0`;
- an existing patch sequence increments from its current value, such as `0.4.0` to `0.4.1`.

## Prerelease example: `0.4.0-alpha.0`

A prerelease adds a lowercase English label and a numeric iteration:

```text
0.4.0-alpha.0
│ │ │   │   └─ first alpha iteration
│ │ │   └───── prerelease phase label
└─┴─┴───────── target stable version
```

| Part | Meaning |
| --- | --- |
| `0.4.0` | The stable version this prerelease is preparing. |
| `alpha` | An early prerelease phase that may still change substantially. |
| `.0` | The first iteration of the `alpha` phase. Prerelease iteration numbers start at zero. |

A typical progression is:

```text
0.4.0-alpha.0
0.4.0-alpha.1
0.4.0-beta.0
0.4.0-rc.0
0.4.0
```

- `alpha` identifies early testing.
- `beta` identifies a later, more stable testing phase.
- `rc` identifies a release candidate intended to become the stable release if validation succeeds.
- Changing the label starts a new label-specific sequence at `.0`; therefore `alpha.1` may be followed by `beta.0`, not necessarily `beta.2`.
- The final stable version removes the prerelease suffix entirely.

Other meaningful lowercase labels such as `preview` are allowed, but the final numeric iteration is mandatory. Valid examples include `1.0.0-preview.0` and `0.4.0-rc.1`.

## Choosing which component changes

Starting from `0.4.0`:

| Planned scope | Result | Reason |
| --- | --- | --- |
| Fix a bug or add a compatible refinement to the HTML capability | `0.4.1` | Continue the established patch sequence. |
| Add a separate new feature capability | `0.5.0` | Advance the minor line and start its patch sequence at `0`. |
| Perform a broad whole-project redesign or architectural replacement | `1.0.0` | Advance the major line and start its minor and patch sequences at `0`. |
| Publish the first release candidate for the planned `0.5.0` feature | `0.5.0-rc.0` | Preserve the target version and begin the `rc` iteration at `.0`. |

Do not use suffixes without an iteration number. These names are invalid:

```text
0.4.0-alpha
0.4.0-beta-x
0.4.0-rc1
0.4.0-rc
```

Use this complete pattern for a version name:

```text
^\d+\.\d+\.\d+(?:-[a-z][a-z0-9-]*\.\d+)?$
```
