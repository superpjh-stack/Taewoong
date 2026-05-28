---
name: project-phase8-review
description: TaeWoong AI-MES Phase 8 코드 리뷰 기획 현황 — Phase 7 잔여 갭 즉시 조치 2건 + 전체 코드베이스 리뷰 계획
metadata:
  type: project
---

Phase 8 코드 리뷰 Plan 문서 작성 완료 (2026-05-28).

**Why:** Phase 7 Match Rate 95% 달성 후 두 가지 잔여 갭이 식별됨. Phase 9 배포 진입 전 품질 게이트로 Phase 8 코드 리뷰 단계를 설정.

**즉시 조치 항목 (P1):**
1. `apps/api/src/app.ts`: `helmet()` → `helmet({ contentSecurityPolicy: false })` — Next.js CSP 미들웨어 충돌 방지
2. `apps/api/src/routes/admin.ts`: `notification-rules` + 역할 라우트에 `auditLog` 미들웨어 누락

**검토 범위 요약:**
- P1: 아키텍처 일관성 (Route→Controller→Service 3계층), Server/Client Component 경계, packages/types 중복 타입
- P2: Phase 2 컨벤션 준수, API 응답 형식 `{ data }` / `{ error: { code, message } }`, REST 케밥케이스, TypeScript any 금지, 에러 핸들링
- P3: 미사용 코드 정리, JSDoc 주석

**How to apply:** Phase 8 Design 문서 작성 시 이 항목들을 파일별 검토 순서로 상세화. 갭 분석 목표 Match Rate ≥ 90%.

**Plan 문서 경로:** `docs/01-plan/features/phase-8-review.plan.md` (worktree: phase-7-analysis)
