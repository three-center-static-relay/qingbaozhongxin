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

## Hugging Face free-model intelligence

Hugging Face Router evidence and model-vendor direct-access evidence are separate and must never be collapsed into one boolean.

- `is_free === true` means Hugging Face currently marks that specific Provider route free of charge.
- Explicit Router input/output pricing of zero may be retained as a Router free candidate but is not durable vendor confirmation.
- A model-author/vendor route may require vendor-primary verification even when the Hugging Face Router route is paid, has no zero price, or is not marked `is_free=true`.
- Vendor-primary confirmation never relabels a paid Hugging Face Router route as free; it selects the vendor-direct access path instead.
- If vendor-primary evidence is unavailable, status remains `unverified`; no free assumption and no paid fallback are allowed.

For `zai-org/GLM-4.7-Flash`, the current policy registry uses fixed Z.AI primary documentation sources and, when vendor-direct free status is confirmed, recommends `vendor_direct_api` with required secret `ZAI_API_KEY`.

The legacy Router metadata canary remains available at:

`GET /v1/selftest/huggingface-router-runtime`

The combined model-level decision is available through the approved Intelligence operation:

`huggingface/free_model_status`

## Control-plane drift rule

The repository contract cannot itself enforce Cloudflare Git branch filters. If a non-production PR changes watched files but Cloudflare creates no Build/Deploy status, treat that as **control-plane drift / trigger not verified**, not as a code PASS or FAIL. Reconcile Cloudflare **Settings > Build** against the table above before relying on PR-triggered validation.
