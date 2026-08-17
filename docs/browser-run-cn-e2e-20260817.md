# Cloudflare Browser Run China-mainland E2E — 2026-08-17

## Verdict

**PASS** for the Cloudflare Browser Run Worker binding and `content` Quick Action against a public website hosted in mainland China.

This receipt validates the Browser Run runtime/binding and mainland-China public-web reachability. It does **not** claim that every allowlisted site will render successfully, nor does it claim a separate fresh E2E of every `network-intelligence` adapter operation.

## Real runtime evidence

- Runtime: Cloudflare Browser Run via Worker `BROWSER` binding
- Quick Action: `content`
- Target: `https://tjj.fujian.gov.cn/xxgk/jdsj/`
- Target host: `tjj.fujian.gov.cn`
- Target type: public Fujian Provincial Bureau of Statistics page
- Worker HTTP response: `200`
- Browser upstream HTTP status: `200`
- `X-Browser-Ms-Used`: `10991.80322265625` ms
- End-to-end elapsed time: `12431` ms
- Rendered HTML bytes: `92312`
- Parsed title: `进度数据_ 政务公开_ 福建省统计局`
- Expected content marker present: `true`
- Browser binding: `BROWSER`
- API token used for Browser Run binding: `false`

## Safety / policy evidence

- Arbitrary target URL accepted from caller: `false`
- Login used: `false`
- Cookies injected: `false`
- CAPTCHA bypass: `false`
- Anti-bot evasion: `false`
- Proxy rotation/evasion: `false`

## Cloudflare deployment evidence

One-time production selftest deployment:

- Git commit: `25717a9e93c955bca32367772cc84048d91f38fa`
- Cloudflare Build ID: `bcc66464-bf66-413c-b7c0-11193c4c8d2e`
- Cloudflare Version ID: `78f925bb-e51f-4a66-a69b-16800213ba8f`
- Build conclusion: `success`

Cleanup deployment:

- Git commit: `920e24b8776b3d1c3d2e44a9ee1d6d5249d81996`
- Cloudflare Build ID: `1872f629-2a04-49db-9366-603952a6a197`
- Cloudflare Version ID: `f10f7b1b-c579-4280-8e05-dfb3201e9636`
- Build conclusion: `success`
- Production `/health`: `200`, `ok=true`
- Temporary `/v1/selftest/browser-run-cn`: `404` after cleanup

## Architecture implication

The formal `network-intelligence` branch may treat Cloudflare Browser Run as a **real-E2E-verified browser runtime** for its bounded, fixed-allowlist public-web collection policy. Static fetch remains first where sufficient. Browser Run remains a browser collector, not an arbitrary proxy or general compute runtime.
