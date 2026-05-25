---
name: req-user-sub-vs-id
description: Several inline routes read (req as any).user?.sub for the user id, but authenticate injects AuthUser with .id not .sub — wrong user attribution
metadata:
  type: project
---

`apps/api/src/middleware/auth.ts` `authenticate` sets `req.user` to the decoded access-token payload, which is an `AuthUser` (has `.id`, `.email`, `.roles`, `.permissions`). The access token is signed from `AuthUser` (see auth-service `signAccess`), so it has NO `sub` claim — only the refresh token uses `{ sub: userId }`.

Inline routes incorrectly read `(req as any).user?.sub` for the acting user id:
- `apps/api/src/routes/kpi.ts:277` (POST /targets → created_by) falls back to `?? 1`
- `apps/api/src/routes/data-export.ts:51,71` (requested_by)
- `apps/api/src/routes/ai-datasets.ts:69` uses `(req as any).user?.email` (this one works since AuthUser has email)

Result: `sub` is always undefined → created_by/requested_by silently default to 1 or null = wrong attribution and an `as any` that defeats the typed req.user.

**Why:** authors confused the access-token shape (AuthUser.id) with the refresh-token shape ({sub}).
**How to apply:** flag `(req as any).user?.sub` as a logic bug; correct is `req.user!.id`. Re-grep `\.user\?\.sub` before reporting — may be fixed.
