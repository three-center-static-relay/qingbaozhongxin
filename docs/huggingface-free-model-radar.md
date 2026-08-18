# Hugging Face Free-Model Radar

## Purpose

Use Hugging Face as the first-layer global model intelligence radar while keeping vendor confirmation as a second-layer evidence check.

## Approved operations

- `models`: existing Hugging Face Hub model search.
- `router_models`: read the official Hugging Face Router `/v1/models` inventory and normalize provider metadata.
- `router_model`: read one exact model from the Router.
- `free_models`: return only models that have at least one provider where upstream `is_free === true`.

## Free-status rule

The system is fail-closed:

- `is_free === true` -> `free`.
- `is_free === false` -> `not_free`.
- missing/non-boolean `is_free` -> `unknown`.
- `pricing.input === 0` or `pricing.output === 0` does **not** independently prove free status.
- Hugging Face monthly account credits are separate from provider/model free status and must not be treated as `is_free`.

## Normalized provider fields

- `provider`
- `status`
- `is_free`
- `free_status`
- `pricing.input`
- `pricing.output`
- `context_length`
- `supports_tools`
- `supports_structured_output`
- `first_token_latency_ms`
- `throughput`
- `is_model_author`

Pricing is reported as USD per million tokens when supplied by the Router.

## Radar flow

1. Run `free_models` periodically or on demand.
2. Keep only explicit `is_free === true` providers.
3. Deduplicate by model id and provider.
4. Compare against the expert-center candidate registry.
5. If a usable provider key already exists, send the candidate to controlled capability testing.
6. If no key exists, score the model for value and notify the operator only when registration is worthwhile.
7. Confirm durable/free policy against the model vendor/provider's primary documentation before promoting a candidate into a production expert pool.

## Example request

```json
{
  "provider": "huggingface",
  "operation": "free_models",
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

## Security constraints

- Exact model ids are validated as `owner/model`; arbitrary URLs are rejected.
- The Worker only calls allowlisted Hugging Face Hub/Router endpoints.
- Tokens are passed only in the Authorization header and are never returned.
- Missing upstream fields remain `null`/`unknown`; no zero-value fabrication is allowed.
