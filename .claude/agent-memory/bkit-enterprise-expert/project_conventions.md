---
name: project-conventions
description: TaeWoong AI-MES non-obvious conventions from CLAUDE.md that constrain architecture/design choices
metadata:
  type: feedback
---

TaeWoong AI-MES 프로젝트 규약 (CLAUDE.md 기준):
- 모든 AI 예측/판단 산출물은 `confidence` 점수 필드를 반드시 포함.
- REST 엔드포인트는 kebab-case 복수형 (`/work-orders`, `/raw-materials`).
- DB 컬럼은 snake_case, 컴플라이언스/감사 대상은 soft delete(`deleted_at`).
- LOT 추적은 Closure Table 패턴(`lot_lineage`).
- TypeScript: single quote, no semicolon, 2-space, no `any`.
- Python: snake_case 함수, PascalCase 클래스, 100자 라인.
- LOT 상태 변경은 event-driven 패턴.

**Why:** CLAUDE.md에 명시된 프로젝트 정본 규약. 제조 트레이서빌리티/감사 요구 때문.
**How to apply:** 스키마·API·코드 설계 시 항상 준수. 출하 자동승인은 confidence 임계치 미달 시 사람 승인 강제(안전 마진 우선)로 설계함 — 동일 원칙 유지.
