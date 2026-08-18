# Hugging Face Free-Model Radar v3

## Purpose

Use Hugging Face as the first-layer global model radar and vendor/provider primary documentation as the second evidence layer. The system distinguishes **model/vendor-direct free** from **Hugging Face Router route free**.

## Approved operations

- `models`: Hub model discovery.
- `router_models`: Router provider inventory.
- `router_model`: exact model resolved from the global Router inventory.
- `free_models`: only HF-route evidence (`is_free=true` or explicit 0/0 pricing).
- `free_candidates`: broader radar including model-author/provider routes that need vendor verification.
- `vendor_check_candidates`: model-author routes requiring vendor-primary verification.
- `vendor_free_status`: verify an allowlisted model against its vendor primary policy source.
- `free_model_status`: combine HF Router evidence and vendor-primary evidence into one final decision.

## Evidence hierarchy

### HF provider current/promo free

`is_free === true` -> `provider_promo_free`.

Hugging Face defines this as current provider free-of-charge status and notes it may be a temporary promotion.

### HF zero-price candidate

Explicit `pricing.input === 0` and `pricing.output === 0` -> `zero_price_candidate`.

This is a Router-route candidate, not durable vendor confirmation.

### Vendor-check candidate

A provider marked `is_model_author === true` may enter `vendor_check_candidate` even when HF does not mark that route free. This prevents missing models whose vendor offers a separate free direct API while aggregation/router routes remain paid.

### Vendor-confirmed free

A fixed allowlisted vendor-primary pricing/policy source is fetched and checked. A positive result -> `vendor_confirmed_free`.

Vendor confirmation does **not** relabel a paid HF Router route as free. It changes the recommended access path to the vendor-direct API.

## GLM-4.7-Flash reference case

Fresh Cloudflare diagnostics on 2026-08-18 established:

1. HF Router global `/v1/models` contains `zai-org/GLM-4.7-Flash` with Provider metadata.
2. Provider entries expose boolean `is_free` signals, but no Provider returned `is_free=true` in the diagnostic.
3. No HF Router Provider had explicit 0/0 input/output token pricing in the diagnostic.
4. Cloudflare successfully fetched the fixed Z.AI official pricing page and found `GLM-4.7-Flash` with nearby `Free` evidence.

Therefore the correct classification is:

- HF Router free route: **not confirmed**.
- Vendor-direct model: **`vendor_confirmed_free`**.
- Recommended access: **`vendor_direct_api`**.
- API model: `glm-4.7-flash`.
- Required secret: `ZAI_API_KEY`.
- Paid fallback: **disabled**.

## Final status request

```json
{
  "provider": "huggingface",
  "operation": "free_model_status",
  "args": {
    "model_id": "zai-org/GLM-4.7-Flash"
  }
}
```

Expected decision fields include:

- `final_free_status`
- `recommended_access`
- `router`
- `vendor.vendor_free_verified`
- `vendor.evidence`
- `vendor.access.required_secret`
- `vendor.access.key_present`
- `vendor.access.registration_required`
- `vendor.access.registration_url`
- `paid_fallback_allowed`

## Registration workflow

If vendor-primary evidence confirms free access but the required key is absent, return `registration_required=true` and the official key-management URL. Do not substitute a paid Router route.

For the Z.AI direct path the canonical environment variable is `ZAI_API_KEY`.

## Global radar flow

1. Discover relevant/recent/high-value models from Hugging Face Hub and Router.
2. Read Provider status, pricing, tool support, structured-output support, latency and throughput.
3. Keep explicit HF free/zero-price routes as Router candidates.
4. Send model-author routes to the vendor-check queue even if HF route pricing is paid or absent.
5. Verify allowlisted vendor primary pricing/policy sources.
6. Produce one final status using `free_model_status`.
7. If vendor-direct free and key exists, send to a bounded capability canary.
8. If vendor-direct free and key is absent, notify the operator to register the named key.
9. If all free evidence disappears, remove the model from the free production pool; never silently fall back to paid inference.

## Security constraints

- Exact model IDs are validated as `owner/model`.
- Vendor URLs come only from an internal allowlisted policy registry; callers cannot supply arbitrary URLs.
- Vendor verification is metadata/page reading only; no inference call is made.
- Secret values are never returned.
- Missing evidence remains unverified.
- Model/vendor-direct free and HF Router free are never conflated.
- Paid fallback remains disabled for the free-model workflow.
