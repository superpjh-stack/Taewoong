---
name: quality-judgement-route-mismatch
description: Quality judgement PATCH used a sub-resource path the backend never registered; resolved by aligning the web service to PATCH /:id
metadata:
  type: project
---

`apps/web/lib/services/quality-service.ts#updateJudgement` originally called `PATCH /quality-inspections/:id/judgement`, but `apps/api/src/routes/quality.ts` only registers `GET /`, `GET /:id`, `POST /`, `PATCH /:id` (mapped to `quality-controller.updateJudgement`, which reads `req.params['id']`). A two-segment path does not match `/:id`, so every judgement submission returned 404 "검사를 찾을 수 없습니다" — the 합격/불합격 modal was fully non-functional.

**Why:** the web service assumed a RESTful sub-resource path (`/:id/judgement`) while the backend implemented judgement as a flat PATCH on the resource. Same frontend-ahead-of-backend class as [[shipments-processes-route-gap]] / [[project-heating-route-mismatch]], but here it's a path *shape* mismatch, not a missing handler.

**How to apply:** RESOLVED 2026-05-24 by aligning the web service to `PATCH /quality-inspections/:id`. When QAing any update/judgement/approve action, don't just confirm the backend has *a* handler — confirm the exact path shape matches (flat `/:id` vs sub-resource `/:id/action`). Express `/:id` will silently 404 on extra segments.
