# Plugin Compatibility

CodeCraft integrates with DSH's native workspace, file tabs, and document-viewer lifecycle. Other plugins may change the same host surfaces and prevent CodeCraft from receiving the workflow it expects, even when CodeCraft itself is installed correctly.

This document records known compatibility scenarios and their configuration workarounds. CodeCraft does not depend on community plugins or maintain version-specific adapters for them.

## Plugins That Modify the Files Sidebar

Plugins such as `dsh-better-sidebar` may replace, hide, or intercept content in the DSH sidebar. When such a plugin controls the **Files** section, CodeCraft may not receive the normal native file-tab workflow even though CodeCraft itself is installed correctly.

If you use a sidebar-modifying plugin:

1. Open DSH **Settings**.
2. Find the settings for the sidebar plugin.
3. Open its **Sidebar Content** configuration.
4. Disable the plugin's effect on **Files**.
5. Restart DSH Desktop if the setting does not take effect immediately.
6. Open a supported source file from DSH's native **Files** sidebar and confirm that CodeCraft appears in the native file tab.

The exact setting labels may vary between plugin versions. The required outcome is that DSH's native **Files** experience remains responsible for opening files.

## Troubleshooting

Check this configuration when:

- the native **Files** entry is missing or replaced;
- selecting a file does not open a native file tab;
- CodeCraft is installed but never appears as a document viewer;
- disabling the sidebar plugin restores normal file opening.

When investigating a new plugin conflict, first identify which native DSH surface the other plugin replaces or intercepts. Prefer configuring that plugin to leave CodeCraft's required native workflow enabled. Record confirmed conflicts and reproducible workarounds in this document rather than adding plugin-specific behavior to CodeCraft without a broader architectural need.
