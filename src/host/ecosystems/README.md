# Ecosystem Intelligence Providers

This directory is the reserved Host-side boundary for project and toolchain intelligence that may span languages, such as future Kubernetes, Helm, Maven, or Gradle support.

An ecosystem provider must compose capabilities through the shared intelligence registry and reuse the established workspace, lifecycle, status, security, and managed-process boundaries. It must not introduce a second file tree, editor, terminal, package manager, or unrestricted command runner.

v0.2.0 intentionally ships no ecosystem provider. Add a subdirectory only when a concrete, tested ecosystem feature is implemented.
