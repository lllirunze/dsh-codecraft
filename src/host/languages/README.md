# Semantic Language Providers

This directory is the Host-side boundary for language-specific semantic intelligence. It is parallel to `frameworks/` and `ecosystems/` and will contain the Python provider introduced by v0.2.0.

Language providers configure semantic engines, interpreter or toolchain discovery, workspace activation, and capabilities exposed through the shared intelligence registry. They must reuse the common LSP session, document synchronization, status, security, and managed-process infrastructure.

This directory is distinct from `src/client/languages/`, which owns CodeMirror syntax highlighting and presentation extensions. Host implementations must not be imported into the browser bundle; the shared protocol connects the two sides.
