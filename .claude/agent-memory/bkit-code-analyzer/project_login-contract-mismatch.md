---
name: login-contract-mismatch
description: RESOLVED — backend login now returns {token,refreshToken,user} matching the web auth-service; contract aligns as of 2026-05-22
metadata:
  type: project
---

The login response-contract mismatch that previously broke login end-to-end is now RESOLVED (verified 2026-05-22).

Current aligned state:
- Backend `apps/api/src/services/auth-service.ts` `login()` returns `{ token, refreshToken, user }` (not `accessToken`). `auth-controller.login` does `ok(res, tokens)` → `{ success: true, data: { token, refreshToken, user } }`.
- Web `apps/web/lib/services/auth-service.ts` reads `res.data.token`, `res.data.refreshToken`, `res.data.user` — all present. `saveToken` writes both localStorage and a `token` cookie; `middleware.ts` reads the `token` cookie for the route guard. Consistent.

Note: `refreshTokens()` (backend) still returns `{ accessToken, refreshToken }` — only the refresh path uses the `accessToken` name. If a web refresh flow is added, watch for that field name. Login itself is fine.

**Why:** earlier the two contracts were written independently; they have since been reconciled on the login path.
**How to apply:** Do NOT flag login contract as Critical anymore — re-read both files first. The naming split survives only in the refresh endpoint. Related: [[api-response-contract]].
