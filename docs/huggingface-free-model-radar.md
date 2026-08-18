# Hugging Face Free-Model Radar v2

## Purpose

Use Hugging Face as the first-layer global model intelligence radar while keeping model-vendor/provider primary documentation as the second evidence layer.

## Approved operations

- `models`: existing Hugging Face Hub model search.
- `router_models`: read the official Hugging Face Router `/v1/models` inventory and normalize provider metadata.
- `router_model`: resolve one exact `owner/model` from the stable global Router inventory.
- `free_models`: backward-compatible free-candidate radar.
- `free_candidates`: explicit free-candidate radar.

## Evidence hierarchy

Hugging Face Router fields answer different questions and must not be collapsed into one boolean.

### 1. Provider promotional/current-free signal

`is_free === true` means Hugging Face currently marks that provider route free of charge. The Router documentation describes this as a provider-level signal that may be a temporary promotion.

Classification: `provider_promo_free`.

### 2. Zero-price candidate

When both fields are explicitly numeric zero:

- `pricing.input === 0`
- `pricing.output === 0`

but `is_free !== true`, the route is classified as `zero_price_candidate`.

This is sufficient for discovery but **not** sufficient for durable-free promotion. It must carry `requires_vendor_confirmation: true` until primary vendor/provider documentation confirms the policy.

### 3. Vendor-confirmed free

The intelligence workflow checks the model vendor/provider's primary documentation after discovery. If the primary source explicitly states that the model/tier is free, that separate evidence may promote the candidate to `vendor_confirmed_free` in the downstream candidate registry.

The Hugging Face adapter itself does not fabricate this status from Router fields.

### 4. Unknown / paid

- Explicit non-zero prices with no free signal are not free candidates.
- Missing price and missing `is_free` remain `unknown`.
- Hugging Face monthly account credits are separate from model/provider free status.

## Why the evidence model changed

A real Cloudflare-side Router diagnostic on 2026-08-18 found `zai-org/GLM-4.7-Flash` in the global `/v1/models` inventory with provider metadata and explicit boolean `is_free` signals, but no provider was marked `is_free: true`. Independent Z.AI primary documentation simultaneously described GLM-4.7-Flash as free.

Therefore `is_free === true` cannot be the sole global-free-model criterion. It is retained as a strong provider-level signal, while zero pricing becomes a discovery candidate that requires vendor confirmation.

## Normalized provider fields

- `provider`
- `status`
- `is_free`
- `free_status` (legacy compatibility)
- `pricing.input`
- `pricing.output`
- `zero_priced`
- `free_evidence`
- `requires_vendor_confirmation`
- `context_length`
- `supports_tools`
- `supports_structured_output`
- `first_token_latency_ms`
- `throughput`
- `is_model_author`

Pricing is reported as USD per million tokens when supplied by the Router.

## Model-level fields

- `promo_free_providers`
- `zero_priced_providers`
- `free_candidate_providers`
- `promo_free_provider_count`
- `zero_priced_provider_count`
- `free_candidate_provider_count`
- `explicit_free_signal_count`
- `free_radar_status`
- `requires_vendor_confirmation`

Legacy aliases remain available for compatibility:

- `free_providers`
- `free_provider_count`
- `has_explicit_free_provider`
- `free_status`

## Radar flow

1. Read the global Router `/v1/models` inventory.
2. Discover candidates where a provider has `is_free === true` or explicit input/output prices of zero.
3. Label the evidence source instead of collapsing it to a single free boolean.
4. Deduplicate by model id and provider.
5. Check the vendor/provider primary documentation for zero-priced candidates and for any model intended for durable production use.
6. Compare confirmed candidates against the expert-center candidate registry.
7. If an existing provider key is available, run a bounded capability canary.
8. If a useful candidate needs a new key/account, notify the operator to register it.
9. If a previously free route becomes paid or loses supporting evidence, remove it from the free production pool rather than silently falling back to paid usage.

## Example request

```json
{
  "provider": "huggingface",
  "operation": "free_candidates",
  "args": {
    "query": "GLM",
    "live_only": true,
    "supports_tools": true,
    "limit": 20
  }
}
```

## Example exact-model request

```json
{
  "provider": "huggingface",
  "operation": "router_model",
  "args": {
    "model_id": "zai-org/GLM-4.7-Flash"
  }
}
```

`router_model` resolves the exact ID from the global `/v1/models` response. This avoids depending on a single-model response shape that differed during real Cloudflare diagnostics.

## Production runtime canary

A bounded read-only canary is exposed at:

`GET /v1/selftest/huggingface-router-runtime`

It always checks the fixed model `zai-org/GLM-4.7-Flash` and does not call chat/completions or inference endpoints:

- `inference_called: false`
- `model_tokens_used: 0`
- `cost_incurred: false`

The canary should expose both legacy explicit-`is_free` fields and the v2 evidence fields so operational monitoring can distinguish provider-promo-free from zero-price candidates.

## Security constraints

- Exact model ids are validated as `owner/model`; arbitrary URLs are rejected.
- The Worker only calls allowlisted Hugging Face Hub/Router endpoints.
- Tokens are passed only in the Authorization header and are never returned.
- Missing upstream fields remain `null`/`unknown`; no zero-value fabrication is allowed.
- Zero pricing is accepted as a radar candidate, never silently promoted to vendor-confirmed durable free.
- The runtime canary is metadata-only and cannot be pointed at arbitrary URLs or arbitrary model ids.
