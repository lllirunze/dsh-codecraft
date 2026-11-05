# DSH CodeCraft v0.1.3 Settings Registration Fix

| Field | Value |
| --- | --- |
| Status | Implemented |
| Target version | 0.1.3 |
| Baseline | 0.1.2 |
| Release type | Patch |
| Scope | Restore the CodeCraft settings entry without changing editor behavior |

## Problem

The v0.1.2 settings card was not visible in DSH Desktop. DSH addresses persisted plugin settings by the Cordis Loader entry ID, but the client requested configuration with the document-preview and package identity `dsh-codecraft`. The actual Loader entry ID is `codecraft`, so DSH did not expose the requested configuration namespace.

Bundling `@deepseek-ai/schemastery` could also create a second schema instance instead of sharing DSH's instance, risking incompatible configuration registration during Desktop startup.

## Design

- Use `codecraft` only when reading or subscribing to the plugin configuration namespace.
- Keep `dsh-codecraft` as the package, document-preview, and slot identity.
- Keep `@deepseek-ai/schemastery` external in the Host bundle.
- Do not change auto-save defaults, interval choices, safe-write behavior, or editor commands.
- Add build verification that fails when the wrong settings namespace is restored or Schemastery is bundled.

## Definition of Done

The settings card appears under **Settings → CodeCraft**, values persist across restart, auto-save remains safe, manual save still works, and the Host and client builds preserve their expected external dependencies. See [validation.md](validation.md) for recorded evidence.

