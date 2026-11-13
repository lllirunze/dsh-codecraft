# DSH CodeCraft v0.5.1 Validation Plan

| Field | Value |
| --- | --- |
| Target version | 0.5.1 |
| Baseline | 0.5.0 |
| Status | Automated validation PASS; Desktop candidate BLOCKED and native acceptance NOT VERIFIED |
| Design | [design.md](design.md) |

## Automated Requirement Matrix

| Requirement | Automated evidence | Desktop evidence |
| --- | --- | --- |
| IC-01 | Uninstalled/error state renders built-in glyphs | Start without cache and confirm default Explorer/title icons |
| IC-02 | State and API installation tests; settings build registration | Install/reinstall button progress, result, and retry experience |
| IC-03 | Exact dependency/lock/integrity and generated-output equality | Installed status reports the compatible version |
| IC-04 | Cache path unit tests for default and `DSH_HOME` roots | Confirm installation does not modify workspace or plugin files |
| IC-05 | Registry fallback unit test and real tarball smoke | Mainland-China network and fully disconnected failure behavior |
| IC-06 | Integrity, hash, unsafe SVG, traversal, size, completeness tests | Invalid download gives a contained settings error |
| IC-07 | Failed reinstall preservation and deterministic generation tests | Retry after failure without losing a prior installation |
| IC-08 | Authenticated API parsing, declared-name reads, traversal rejection, and cache-tampering tests | Icon reads succeed through the running Desktop Host API |
| IC-09 | Subscribed state, shared Client API loader, inline rendering, and fallback tests/build verification | Mounted tree/title changes after install; restart remains installed |
| IC-10 | Client slot registration verification | Native Explorer tab shows icon and localized label |
| IC-11 | Source/build/package SVG absence checks | Not applicable beyond package inspection |
| IC-12 | `icons:sync`, `icons:verify`, deterministic generation | Developer update smoke when intentionally changing version |
| IC-13 | Workspace and full regression suites | Create/rename/copy/move/delete, editor, save, and restart smoke |
| IC-14 | Packed `THIRD_PARTY_NOTICES.md` inspection | Not applicable beyond package inspection |
| IC-15 | Unknown file, folder, expanded folder, symlink, and other-kind resolver cases return no Material resource and do not throw | Confirm unmatched rows retain default icons without an error banner, blank row, or broken image |

## Focused Automated Checks

- [x] Exact version, lockfile integrity, complete maps, icon filenames, and hashes agree.
- [x] Repeated development synchronization is byte-identical and copies no SVG files.
- [x] Unsafe upstream SVG or failed generation preserves both last-good generated modules.
- [x] Default and explicit `DSH_HOME` cache paths use the DSH cache category.
- [x] Configured/domestic/official registry ordering and fallback are bounded and deterministic.
- [x] Real `material-icon-theme@5.40.0` tarball installs all 1,256 expected icons and a marker.
- [x] Package integrity, per-file hash, active-content, missing-file, traversal, and size failures are rejected.
- [x] Failed reinstall preserves the previous complete version.
- [x] API status/install requests require authentication but do not require a workspace session.
- [x] Icon reads reuse the authenticated POST API, require a declared basename, and repeat SVG safety and hash validation.
- [x] Concurrent rows share one Client icon read; mismatched and malformed API responses are rejected without caching.
- [x] Explorer exact-name, compound-extension, named-folder, expanded, and root resolution remains correct.
- [x] Unmatched files, folders, expanded folders, symlinks, and other entries resolve directly to built-in icons without throwing.
- [ ] Uninstalled, failed, and missing-resource states render built-in glyphs without blocking Explorer behavior.
- [x] Build and packed artifact contain no Material SVG files and include third-party attribution.

## Automated Evidence

| Check | Command | Status | Evidence |
| --- | --- | --- | --- |
| Focused icon pipeline | `npx vitest run tests/file-icons.test.ts tests/material-icon-client.test.ts tests/material-icons.test.ts tests/material-icon-install.test.ts tests/routes.test.ts` | PASS | 5 files, 34 tests |
| Workspace regression | `npx vitest run tests/workspace-operations.test.ts tests/workspace-sync.test.ts tests/routes.test.ts` | PASS | 3 files, 41 tests |
| Canonical gate | `npm run check` | PASS | Typecheck; 28 files / 283 tests; build; generated metadata and build verification |
| Deterministic mapping sync | `npm run icons:sync` with before/after generated-module hashes | PASS | Byte-identical combined hash `8da12cacae52aae2c93277ef8a9215ca97368ab25a2ef6899a1b4c43b9b2bfb9` |
| Package inspection | `npm pack --dry-run --ignore-scripts --json` | PASS | 95 files; 873,619 bytes packed; 3,357,020 unpacked; zero SVGs; required runtime files and notice present |
| Real registry smoke | Bundled current installer to a temporary module and installed the pinned package into a temporary cache | PASS | 1,256 icons; installed/status true; `python.svg` 773 bytes; temporary cache removed |
| Installed-cache API source smoke | Bundled the current Host reader and read the existing DSH cache without mutation | PASS | Installed `5.40.0`, 1,256 icons; `python.svg` revalidated at 773 bytes; traversal name rejected |
| Repository SVG inspection | `find` excluding `.git` and `node_modules` | PASS | Zero SVG files |

## Local DSH Desktop Candidate Gate

Profile mutation requires explicit authorization. Until authorized, this gate is `BLOCKED` and all native behavior remains `NOT VERIFIED`.

- [ ] Record Git SHA, package version, DSH Desktop version, platform, profile, expected source, and absolute repository path.
- [ ] Apply exactly one local CodeCraft source through DSH Plugin Manager and record its receipt.
- [ ] Fully restart Desktop after replacing Host or Client code.
- [ ] Confirm the Host row registers the exact API route once and has no obsolete Material icon prefix route.
- [ ] Confirm Config schema and `packageDir` resolve from the expected source.
- [ ] Confirm Client preview, settings, Explorer body, Explorer title, dialog, and HTML action registrations occur once.
- [ ] Confirm unauthenticated `/codecraft/api` reaches the authentication fence rather than a generic 404.
- [ ] Confirm no new activation failure, blank page, reload loop, unhandled error, or crash.

## Native Acceptance

Run independently on macOS and Windows against the current candidate.

### Default and failure behavior

- [ ] With no matching cache, Desktop starts and Explorer rows/title use default glyphs without any automatic network request.
- [ ] Open, edit, Undo/Redo, save, close, and reopen a supported file while icons are absent.
- [ ] Disconnect networking, click Install Icons, and confirm a contained retryable error while defaults and all Explorer operations remain usable.
- [ ] Restart while disconnected with no cache and confirm startup remains normal.

### Installation and rendering

- [ ] Settings shows Material Icon Theme `5.40.0`, installation status, and the Install Icons button.
- [ ] In mainland China, the button succeeds through the reachable domestic/configured registry without requiring GitHub access.
- [ ] The installed state appears without a full restart and reports 1,256 icons.
- [ ] Python, Java, HTML, TypeScript, Rust, Go, README, package metadata, scripts, and data files show mapped icons; unknown files keep the built-in icon.
- [ ] Named folders and expanded variants update, while unmatched folders keep the built-in icon without layout or selection movement.
- [ ] The native Explorer tab title displays the workspace icon and localized title.
- [ ] Restart offline after successful installation and confirm icons remain available with no external request.
- [ ] Reinstall and confirm no blank rows, duplicate requests, stale mappings, or loss of the previous working set.

### Regression and platform coverage

- [ ] Create, rename, copy, move, delete, refresh, drag/drop, multi-select, keyboard navigation, and dirty-file barriers retain v0.5.0 behavior.
- [ ] Paths containing spaces, Chinese characters, mixed case, and Unicode remain safe.
- [ ] Python, Java, and HTML editing assistance remains independent of icon installation.
- [ ] Settings persistence, normal exit, and restart smoke pass.
- [ ] macOS: Finder reveal, Trash, Command shortcuts, and offline restart pass.
- [ ] Windows: Explorer reveal, Recycle Bin, Ctrl shortcuts, backslash paths, and offline restart pass.

## Release Gate

Release remains blocked until automated/package gates pass, the local Desktop candidate is applied and inspected with authorization, and the user reports the required macOS and Windows native acceptance results. Publication still requires a separate explicit release request.
