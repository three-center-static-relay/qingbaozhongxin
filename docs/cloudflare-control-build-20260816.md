# Cloudflare control build — 2026-08-16

Diagnostic-only marker used to trigger a Cloudflare Git build from the current `main` baseline without changing Worker runtime code, build scripts, provider adapters, secrets, routes, or deployment behavior.

Interpretation:
- if this branch deploys successfully while the isolated Wind runtime-selftest branch fails, the Wind delta is implicated;
- if this branch also fails, the failure is in the shared baseline/build/install/bundle/deploy layer rather than the Wind delta.
