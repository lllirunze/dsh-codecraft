# DSH CodeCraft v0.1.3 Validation Record

| Field | Value |
| --- | --- |
| Status | Automated validation and macOS Desktop regression passed |
| Recorded | 2026-11-04 |
| Target | macOS and Windows, DSH Desktop `0.2.1-rc.5` |
| Regression | v0.1.2 settings entry was not visible |

## Fix

DSH addresses a plugin's persisted settings by its Cordis Loader entry ID. CodeCraft's entry is `codecraft`, while its document-preview ID and package name are `dsh-codecraft`. v0.1.2 incorrectly used the preview ID for `configForms.get` and `configForms.whileServed`, so DSH never considered the requested settings namespace available and did not register the settings card.

v0.1.3 uses `codecraft` only for settings lookup and keeps `dsh-codecraft` for preview and slot identity.

The Host build also keeps `@deepseek-ai/schemastery` external. This ensures the plugin and DSH use the same schema instance instead of creating an incompatible bundled copy that can block Desktop startup.

## Automated Result

```bash
npm run check
```

The repository check covers strict TypeScript compilation, 61 Vitest tests across eight files, Host and client builds, declarations, and package verification. The build verifier now exposes only the real `codecraft` namespace and registers the settings contribution only when the client requests that namespace. Reintroducing the v0.1.2 mismatch therefore fails verification.

## Manual Desktop Regression

- [x] Install the local v0.1.3 source build and fully restart DSH Desktop.
- [x] Confirm **Settings → CodeCraft** contains the auto-save switch and interval selector.
- [x] Confirm auto save defaults to off and the interval defaults to 30 seconds.
- [x] Change both values, restart Desktop, and confirm they persist.
- [x] Enable auto save, edit a writable file, and confirm it saves after the selected interval.
- [x] Confirm a clean, read-only, or externally conflicted file is not overwritten.
- [x] Confirm `Cmd+S` on macOS still saves immediately.
- [ ] Repeat the native Desktop regression on Windows, including `Ctrl+S`.

The settings card remaining absent or any unsafe write is a release blocker.
