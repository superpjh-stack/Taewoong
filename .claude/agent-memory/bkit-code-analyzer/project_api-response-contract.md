---
name: api-response-contract
description: The standard API response shape and a recurring inconsistency between route handlers and the web client
metadata:
  type: project
---

The standard API response envelope is defined in `apps/api/src/lib/response.ts`: success = `{ success: true, data, message? }`, paginated = `{ success: true, data, pagination }`, error = `{ success: false, error: { code, message, details? } }`. The web `apps/web/lib/api-client.ts` checks `body.success` and throws `ApiError` otherwise.

Recurring defect: many inline route handlers (raw-materials.ts, reference-info.ts, data-management.ts) instead return `{ ok: true, data }` / `{ ok: false, error: 'string' }`. Since the client never sees `success`, even successful responses throw — breaking UI-API integration.

**Why:** two response conventions coexist because handlers were written inline with `res.json({ ok: ... })` instead of using the `ok()/paginated()/error()` helpers.
**How to apply:** when analyzing any API route, check whether handlers use the response helpers or raw `{ ok: ... }`. Flag `ok`-shaped responses as a contract-breaking Critical issue. See [[auth-middleware-locations]].

**UPDATE 2026-05-21 (re-verified):** the `{ ok: ... }` shape is RESOLVED — grep for `ok: true|ok: false` returns 0 hits; raw-materials/reference-info/data-management now emit `{ success: true, ... }`. Remaining contract issues: (1) a few error responses still use string errors instead of `{ code, message }` — raw-materials.ts:209,231 do `error: '원소재를 찾을 수 없습니다'`. (2) Login is broken by a different contract mismatch — see [[login-contract-mismatch]].
