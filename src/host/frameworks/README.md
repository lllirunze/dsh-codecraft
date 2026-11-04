# Framework Intelligence Providers

This directory is the reserved Host-side boundary for framework-specific intelligence such as future Django, FastAPI, or PyTorch support.

A framework provider must depend on an existing language provider and compose capabilities through the shared intelligence registry. It must reuse the common LSP session, document synchronization, completion bridge, workspace identity, status reporting, and process boundary. It must not duplicate those systems or create a separate editor.

v0.2.0 intentionally ships no framework provider. Add a subdirectory only when a concrete, tested framework feature is implemented.
