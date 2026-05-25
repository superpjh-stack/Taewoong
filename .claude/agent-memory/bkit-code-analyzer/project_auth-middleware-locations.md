---
name: auth-middleware-locations
description: Which middleware module exports authenticate vs requirePermission/requireRole, and a common mis-import bug
metadata:
  type: project
---

`apps/api/src/middleware/auth.ts` exports ONLY `authenticate` (JWT verification, injects req.user; fail-fast if JWT_SECRET missing). `apps/api/src/middleware/rbac.ts` exports `requirePermission(...)`, `requireRole(...)`, and `adminOnly`.

Recurring defect: routers import `requirePermission` from `'../middleware/auth.js'` (wrong) instead of `'../middleware/rbac.js'`. Also a router using `requirePermission` MUST first call `router.use(authenticate)` or req.user is undefined and every request 401s. Correct reference example: `raw-materials.ts`.

**Why:** `requirePermission` was moved/placed in rbac.ts but some routers copy-pasted an old import path and forgot the `authenticate` mount.
**How to apply:** for each router, verify (1) `requirePermission`/`requireRole` imported from rbac.js, (2) `authenticate` applied before any permission check. See [[api-response-contract]].

**UPDATE 2026-05-21 (re-verified):** the mis-import defect is RESOLVED across all 20 routers — every one imports `requirePermission`/`requireRole`/`adminOnly` from `rbac.js` and calls `router.use(authenticate)`. Keep verifying on new routers, but the historical copy-paste bug is gone. Note the separate live bug: see [[req-user-sub-vs-id]] (routes read req.user.sub instead of req.user.id).
