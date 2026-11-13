# DSH CodeCraft v0.5.1 Optional Material Icons Design

| Field | Value |
| --- | --- |
| Status | Implemented; automated validation passed; native Desktop acceptance pending |
| Target version | 0.5.1 |
| Baseline | 0.5.0 |
| Platforms | macOS and Windows |
| Scope | Default Explorer icons plus an optional, version-matched Material Icon Theme cache installation |

## Purpose

v0.5.1 adds recognizable icons to the CodeCraft Explorer without shipping or maintaining the upstream SVG collection inside this repository or npm artifact. The Explorer uses its original generic glyphs until the user explicitly selects **Install Icons** in CodeCraft settings. A failed, unavailable, or incomplete download leaves the default icons active and does not affect editing, saving, or workspace operations.

The authoritative raw planning source remains [`docs/planning/dsh-codecraft-v0.5.1-requirements.md`](../../planning/dsh-codecraft-v0.5.1-requirements.md). The user-approved on-demand installation change in this conversation supersedes its bundled-asset assumption.

## Requirements

| ID | Required behavior | Negative and failure behavior |
| --- | --- | --- |
| IC-01 | Show generic built-in file, folder, and workspace glyphs before optional icons are installed | Startup and Explorer rendering must not require network or cached SVGs |
| IC-02 | Add an Install Icons control and clear status to the CodeCraft plugin settings page | Repeated clicks share one bounded installation; failure remains visible and retryable |
| IC-03 | Pin one exact `material-icon-theme` version and generate filename, extension, folder, expanded-folder, root, and icon-file mappings from that same installed development package | Version, lockfile integrity, mappings, hashes, or generated-module drift fails verification |
| IC-04 | Install the exact compatible SVG set under `$DSH_HOME/cache/codecraft/material-icons/<version>/` | Do not write to the plugin package, source tree, workspace, or unrelated profile data |
| IC-05 | Try an inherited npm registry when configured, then the mainland-China `registry.npmmirror.com` endpoint, then the official npm registry | Complete network absence or failure leaves defaults active; the UI must not claim offline first-time installation |
| IC-06 | Verify the downloaded tarball against the lockfile SHA-512 integrity and every extracted SVG against generated SHA-256 metadata and active-content rules | A mismatched, oversized, unsafe, incomplete, or path-escaping archive is rejected |
| IC-07 | Stage and atomically replace one version directory only after all files validate | Failed reinstall preserves the previous complete installation and removes staging output |
| IC-08 | Read only declared SVG basenames through the existing authenticated CodeCraft JSON API and revalidate cache content before returning it | Undeclared names, traversal, cache tampering, invalid responses, and unauthenticated requests are rejected |
| IC-09 | Refresh Client state after startup and installation, fetch each mapped SVG through the same API transport that completed installation, and render validated inline SVG so mounted Explorer rows and the title icon switch without a Desktop restart | A missing or unreadable resource falls back directly to the built-in glyph without relying on a separate Desktop image-resource request |
| IC-10 | Render the workspace icon and localized label through DSH's keyed `sidebar.right.pane.tab.title` slot | Do not depend on a nonexistent tab-definition icon field or private DOM |
| IC-11 | Ship no Material SVG files in source-controlled assets, `lib/`, or the npm package | Build and package verification fail if a Material SVG is reintroduced |
| IC-12 | Keep `npm run icons:update`, `icons:sync`, and `icons:verify` as the development update workflow | Ordinary install, build, startup, and package preparation do not silently change the compatible icon version or mappings |
| IC-13 | Preserve v0.5.0 Explorer operations, native tabs, dirty-document barriers, editor behavior, and Client/Host boundaries | Optional-icon failure must never disable ordinary Explorer or editor behavior |
| IC-14 | Retain third-party project and MIT-license attribution in the published package | Removing the notice or changing upstream license requires review |
| IC-15 | Use a Material icon only when a file name, extension, named-folder, or root rule matches; otherwise render the built-in CodeCraft icon | Unknown files, unnamed folders, unsupported entry kinds, incomplete generated metadata, and image-load failures must not report an Explorer error |

## Architecture

| Capability | Runtime | Placement | Reason |
| --- | --- | --- | --- |
| Development synchronization | Node development scripts | `scripts/material-icons.mjs`, `sync-material-icons.mjs`, `update-material-icons.mjs`, `verify-material-icons.mjs` | One exact dependency produces both Client associations and Host integrity metadata |
| Client mappings | Browser | `src/client/icons/material-icons.generated.ts` | Contains mappings and icon filenames, never SVG content or a download implementation |
| Installer metadata | Host | `src/host/material-icon-package.generated.ts` | Contains the exact version, npm SRI, and per-file hashes generated from the same package |
| Cache installer | Host | `src/host/material-icons.ts` | Owns registry fallback, bounded download, tar extraction, validation, atomic replacement, and cache reads |
| Authenticated icon API | Shared protocol / Host | `src/protocol.ts`, `src/host/routes.ts`, `src/index.ts` | Reuses the single authenticated CodeCraft API for install, status, and verified icon reads; it does not depend on Desktop custom-protocol image navigation |
| Installation state | Browser | `src/client/icons/material-icon-state.ts` | Provides one subscribed state source for settings, Explorer rows, and the title icon |
| Resolution and rendering | Browser React | `file-icon-resolver.ts`, `material-icon-loader.ts`, `FileIcon.tsx`, `ExplorerTitle.tsx` | Resolves from synchronized explicit maps, shares successful API reads in memory, and renders Host-verified inline SVG; unmatched or failed resources render built-in glyphs without surfacing an error |
| Settings UI | Browser React | `CodeCraftSettingsCard.tsx`, `locales.ts`, `theme.ts` | User-owned explicit installation with localized progress, success, fallback, and error states |

## Version and Update Contract

`package.json` is the single editable compatibility declaration:

```json
"material-icon-theme": "5.40.0"
```

After changing that exact version, development runs `npm run icons:update`. The command installs exactly the declared version without lifecycle scripts, updates the lockfile, validates every upstream mapping and SVG, and transactionally regenerates both Client and Host modules. Runtime installation accepts only that generated version and lockfile integrity. Therefore an old cache cannot be combined with mappings from a newer theme.

The npm artifact includes the generated mappings and hashes because they are part of CodeCraft's compatibility contract, but it includes no upstream SVG. The compatible package is downloaded only after explicit user action.

## Download and Mainland-China Behavior

The installer constructs an exact-version npm tarball URL and tries these registries in order:

1. `npm_config_registry` or `NPM_CONFIG_REGISTRY`, when inherited by DSH Desktop;
2. `https://registry.npmmirror.com`;
3. `https://registry.npmjs.org`.

For `5.40.0`, npmmirror and the official registry advertise the same SHA-512 integrity. The pinned integrity remains authoritative, so mirror content is never trusted only because it came from the preferred host. A machine with no route to any registry cannot perform its first installation; the product truthfully reports the error and continues with defaults. Once installed, rendering is entirely local and offline.

## Cache and Security Model

The official DSH home-path convention classifies reproducible downloads as cache data. CodeCraft therefore uses `$DSH_HOME/cache/codecraft/material-icons/<version>/`, falling back to `~/.dsh` when `DSH_HOME` is unset. The cache is outside the plugin and workspace and can be deleted without losing user work.

The Host limits compressed and expanded archive size, checks npm SHA-512 integrity before extraction, accepts only regular `package/icons/<basename>.svg` entries declared by generated metadata, rejects active/external SVG content, checks every SHA-256, and requires the complete expected set. Installation writes a unique staging directory and marker, then atomically swaps the version directory. Every later API read accepts only a declared basename and repeats the active-content and SHA-256 checks, so a modified cache entry is never rendered inline.

## Explicit Exclusions

- Bundling or source-controlling the 1,256 Material SVG files.
- Automatic download during install, startup, build, or package preparation.
- Claiming that first-time installation works with no network or reachable registry.
- Executing npm lifecycle scripts or installing the upstream VS Code extension at runtime.
- User-defined mappings, theme marketplace behavior, or multiple selectable Material versions.
- Release metadata changes, commits, pushes, tags, or publication during implementation.

## Definition of Done

- IC-01 through IC-15 are traceable to automated evidence and the required Desktop checklist.
- The repository and packed artifact contain zero Material SVG files.
- The generated Client mapping and Host integrity metadata come from the same exact dependency and lockfile integrity.
- Real-package installation succeeds from a registry into a temporary DSH-style cache and exposes all expected icons.
- Missing network, invalid archives, failed reinstall, missing cache, and resource failures retain default icons and ordinary product behavior.
- Full automated regression and package inspection pass on the final worktree.
- Native DSH Desktop installation/settings/Explorer/offline checks remain user-observed acceptance work before release.
