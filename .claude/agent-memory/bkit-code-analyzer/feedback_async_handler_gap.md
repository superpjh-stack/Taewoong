---
name: feedback-async-handler-gap
description: API controllers are bare async functions with no asyncHandler wrapper, so service rejections become unhandled and bypass errorHandler
metadata:
  type: feedback
---

When analyzing `apps/api/src/controllers/*.ts`, check whether async controller functions have error propagation. As of 2026-05-21 there is no `asyncHandler`/`catchAsync` wrapper anywhere (`grep asyncHandler` → 0 hits), and controllers do not try/catch around service calls (except ai-agent query). A rejected promise from a service (e.g. DB error) becomes an unhandled rejection and never reaches the global `errorHandler` in `apps/api/src/lib/response.ts`, hanging the request.

**Why:** This is a systemic, repository-wide gap — not isolated to one route — so it should surface as Critical in any API analysis until fixed.
**How to apply:** On any API code review, verify async error handling first. If still unfixed, recommend an `asyncHandler` wrapper applied to all routes. Re-grep before reporting — this may get fixed and the memory go stale. Related: `errorHandler` also leaks raw `err.message` to clients (sensitive-data exposure).
