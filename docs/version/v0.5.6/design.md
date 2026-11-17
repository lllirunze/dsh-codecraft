# dsh-codecraft v0.5.6 Design

## Metadata

| Field | Value |
| --- | --- |
| Status | Implemented; automated validation passed; Desktop acceptance pending |
| Target | `0.5.6` |
| Baseline | `0.5.5` at Git `61313a6245c4cb4dc6c137236009d854527677b1` |
| Release type | Patch enhancement |
| Platforms | DSH Desktop on macOS and Windows |
| Scope | Brand-logo integration and native file-tab icon consistency |

## Purpose

This release makes the approved CodeCraft logo visible at the plugin and Files-guide entry points, adds the same logo to both root README files, and makes each native DSH file tab use the same Material Icon Theme resolution path as the workspace tree. It is a visual-consistency release: editing, saving, file operations, tab lifecycle, and DSH global UI behavior remain unchanged.

The user supplied the visual baseline as `favicon.png`. Because the planning directory is ignored, the deliverable is a self-contained, version-controlled `assets/favicon.svg`. The SVG embeds a 256 by 256 PNG derivative of the supplied square artwork. This preserves its appearance at the intended UI and README sizes while keeping the manifest icon below DSH's 256 KiB package-icon limit. `.gitignore` is not changed.

## Current Baseline

- `package.json` already defines the stable package, Host, Client, and DSH integration identities but has no package icon.
- The CodeCraft Files tab owns a Start-page guide entry through `SidebarRightTabDefinition.guide`, which currently has no custom icon.
- The workspace tree, Explorer title, and breadcrumbs already share `FileIcon`, `resolveFileIcon`, the generated Material Icon Theme mapping, and the guarded local SVG loader.
- DSH's shared document-preview tab type owns native file-tab titles. CodeCraft can contribute a scoped title renderer through `sidebar.right.pane.tab.title` without replacing global or non-file tabs.
- Rename and move operations replace the old resource tab with the updated resource address. Restored and switched tabs expose their own current `navigation.address`, so a title renderer derived from that address stays synchronized without separate icon state.

## Requirements

| ID | Required behavior | Negative and failure behavior | Ownership |
| --- | --- | --- | --- |
| FR-01 | The installed `dsh-codecraft` package entry displays the formal logo in DSH Plugin Manager/configuration surfaces that honor package metadata. | Do not patch DSH-owned global artwork or affect another plugin. A host surface that does not expose package icons remains host-owned and must not be represented as verified. | `package.json`, `assets/favicon.svg`, package verification |
| FR-02 | The Start-page CodeCraft Files guide button displays the same logo while preserving its title, description, command, layout, and interaction. | Missing or failed optional icon rendering must not alter the command or crash the guide page. Other guide entries remain unchanged. | Client branding component and Files guide definition |
| FR-03 | Every supported native Session file tab displays the Material Icon Theme result for its own current filename/path, using exact-name precedence, compound-extension matching, and the existing generic-file fallback. | Non-file and malformed resource addresses retain the host title without a CodeCraft icon. The brand logo is never a file fallback. No network icon fetch or duplicate mapping is added. | Native document-preview title slot, shared `FileIcon`, existing address parser and icon resolver |
| FR-04 | `README.md` and `README.zh-CN.md` show the same repository-relative logo above their titles with consistent dimensions and alternative text. | Existing badges, language navigation, content, and status claims are preserved. | Root README files and shared asset |
| AT-01 | Build and package checks recognize and include the logo asset. | Missing, oversized, externally linked, or malformed assets fail verification. | `scripts/verify-build.mjs` |
| AT-02 | The package manifest points its icon metadata to the formal logo. | A path outside the package or omitted asset fails verification. | Manifest verification |
| AT-03 | The Files guide entry uses the formal logo component and retains its command. | Other guide entries are not changed. | Focused source/build registration tests |
| AT-04 | File-tab inputs produce the same shared resolver inputs and results as the tree for representative file types. | Each tab derives from its own address; activity changes cannot overwrite sibling icon identity. | File-tab title helper tests and existing resolver tests |
| AT-05 | Existing exact-filename precedence is preserved. | Extension matching must not override an exact filename mapping. | Existing and focused resolver tests |
| AT-06 | Unknown or extensionless files use the existing default file icon. | They never use the CodeCraft brand logo. | Existing and focused resolver tests |
| AT-07 | A changed filename/path produces a newly derived icon input. | Malformed and non-Session addresses remain safely unmodified. | File-tab title helper tests |
| AT-08 | Both README image references resolve to the tracked logo. | No external image host or duplicate logo is introduced. | Documentation/package verification |

## Architecture and Data Flow

### Shared brand asset

`assets/favicon.svg` is the single source used by package metadata, the browser bundle, and both READMEs. The asset is self-contained, square, offline, below 256 KiB, and included by `package.json.files`. The Client build imports it through esbuild's SVG data-URL loader; no runtime absolute path or network request is required.

### Plugin Manager icon

The top-level package manifest field `icon: "assets/favicon.svg"` uses DSH's package-icon contract. This is deliberately separate from the existing `plugins.item` settings contribution, whose surrounding card artwork and layout are host-owned. Stable plugin ids, bundle patch ids, Client injection ids, routes, and settings ids do not change.

### Start-page Files guide icon

A small Client-only `CodeCraftLogo` React component renders the bundled asset with fixed intrinsic dimensions and `object-fit: contain`. The existing Files guide entry receives this component through its public `icon` property. The guide entry's `workspace.files` command, labels, ordering, and Files tab registration remain intact.

### Native file-tab icons

CodeCraft intentionally shadows DSH's occupied keyed presentation cell in `sidebar.right.pane.tab.title`, using the shared document-preview tab definition id and a lower Slot priority. This is the public keyed-slot replacement contract: while CodeCraft is active its Material-aware title is the winner, and disposal restores DSH's generic `FileTypeIcon` title. It does not create a duplicate tab type or registration identity. The component reads its own tab's current `navigation.address` through the provided `useTabInfo` hook:

1. Parse only authenticated Session file addresses with `parseSessionFileAddress`.
2. Derive the current basename with `fileNameOf`.
3. Pass `{ name, path, kind: 'file' }` to the existing `FileIcon` component.
4. Render the unchanged native title beside the icon.
5. For a non-file or malformed address, render only the unchanged title.

`FileIcon` remains the single mapping and fallback path for both tree rows and file tabs. It uses the pinned, locally managed Material Icon Theme assets and already contains contained loading/error fallbacks. No tab-global mutable icon state is introduced. Rename, move, restore, and multi-tab correctness follow from rendering each title against its own current resource address.

## Runtime, Safety, and Compatibility

- Browser code imports no Node APIs; Host behavior and protocol contracts are unchanged.
- Logo and Material icons are local-first and require no network access.
- The new slot registration is lifecycle-owned by `ctx.effect` and disposes through the existing Slots service contract.
- Invalid encoded paths and non-Session navigation addresses do not throw; they fall back to the host title.
- Material icon load failure retains the existing generic file glyph and does not affect opening, editing, or saving.
- No settings, persisted data, routes, subprocesses, timers, or file contents are added or changed.
- Package and runtime identities listed by the Desktop safety protocol remain stable.

## Out of Scope

- DSH Desktop's application icon, global logo, global navigation, layout, themes, or unrelated tabs.
- Replacing DSH-owned artwork in surfaces that do not expose package icon metadata.
- A Material Icon Theme upgrade, new mapping table, remote icon download, or brand-logo file fallback.
- Changes to file opening, switching, closing, dirty state, saving, rename/move semantics, or workspace restoration.
- Package version bump, changelog release entry, Git commit/tag/push, npm publication, or GitHub Release publication.

## Implementation Sequence

1. Normalize the supplied logo into the tracked, size-safe self-contained SVG and add package icon metadata and verification.
2. Add the reusable Client logo component and attach it only to the CodeCraft Files guide entry.
3. Add the scoped native file-tab title component and register it against DSH's document-preview tab type.
4. Add focused tests for safe address adaptation, mapping reuse, rename/move-derived updates, fallback behavior, manifest registration, and README references.
5. Add the shared logo to both README headers without changing their release status claims.
6. Run focused checks, the full repository gate, packed-artifact inspection, and then hand off native macOS/Windows acceptance.

## Definition of Done

- FR-01 through FR-04 and AT-01 through AT-08 have traceable implementation and current automated evidence.
- The package contains one self-contained `assets/favicon.svg`, the manifest references it, and the browser bundle needs no logo network request.
- Each valid Session file tab uses the same `FileIcon` path as the workspace tree; invalid or non-file tabs remain unchanged.
- Existing editing, saving, file operation, and tab behavior passes the repository regression gate.
- The local Desktop candidate safety gate is either completed with explicit authorization or reported accurately as not verified.
- macOS and Windows native acceptance remains unchecked until the user reports observed results.

