# Cloudflare Workers Builds contract

Configure `intelligence-worker` under **Settings > Build** with the repository contract below.

| Setting | Required value |
|---|---|
| Root directory | empty (repository root) |
| Production branch | `main` |
| Build watch include | `*` |
| Production deploy command | `npm run cf:deploy` |
| Non-production deploy command | `npm run cf:preview` |
| Non-production branches | include `*`, exclude `main` |

The repository commands are intentionally explicit:

- `npm run cf:build` runs the deterministic fail-closed build gate.
- `npm run cf:deploy` runs the gate and then `wrangler deploy`, which is the production promotion path.
- `npm run cf:preview` runs the same gate and then `wrangler deploy --dry-run`; preview builds validate packaging/configuration but do not promote traffic.

Cloudflare Workers Builds distinguishes the production branch from non-production branches in the control plane. A successful non-production build therefore must not be interpreted as proof that the live `workers.dev` Worker changed.

Operational acceptance for a production change requires both:

1. the production-branch build/deploy succeeds; and
2. a fresh request to the live Worker observes the new runtime capability/version.

For the Hugging Face free-model radar, the post-deploy canary is:

`GET /v1/selftest/huggingface-router-runtime`

A provider is treated as free only when the live Hugging Face Router response explicitly contains `is_free: true`; zero pricing alone is not sufficient.
