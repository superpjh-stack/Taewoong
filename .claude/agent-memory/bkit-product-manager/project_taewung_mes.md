---
name: project-taewung-mes
description: ㈜태웅 제조AI MES 프로젝트 - 중공업 단조/열처리 제조업체 MES 시스템 개발
metadata:
  type: project
---

㈜태웅 제조AI MES 시스템 개발 프로젝트.

**핵심 공정**: 입고 → 가열(가열로) → 단조 → 열처리 → 검사 → 출하

**핵심 식별자**: Heat No.(제강 배치), LOT 번호

**담당 모듈**:
- 모듈 3: 가열공정관리 (가열공정 모니터링, 작업조건관리, 공정이력조회, 공정데이터분석, 가열 최적화 AI)
- 모듈 4: 검사출하관리 (출하관리, 출하이력조회, 출하데이터관리, 출하 AI Agent, 품질검사)
- 모듈 5: 공정관리 (공정실적관리, 공정 데이터 모니터링, 작업조건관리, 공정이력조회, 공정데이터 분석)

**계획 문서 위치**:
- `docs/01-plan/02-PM-heating-shipping.md`
- `docs/01-plan/features/shipments-submenus.plan.md` (검사출하관리 5개 하위메뉴)
- `docs/01-plan/features/processes-submenus.plan.md` (공정관리 5개 하위메뉴)

**하위메뉴 기획 완료 (2026-05-21)**:
- 검사출하관리: 출하관리, 출하이력조회, 출하 데이터관리, 품질검사(기존 /quality 이동), 출하 AI Agent
- 공정관리: 공정실적관리, 공정 데이터 모니터링, 작업조건관리, 공정이력조회, 공정데이터 분석
- 두 모듈 간 공정이력-검사결과 Heat No. 기준 연계 API 정의 포함

**Why:** 가열 온도 편차가 단조 품질을 결정하는 핵심 인과 공정이며, 출하 합부 판정 자동화로 납기 준수율 및 클레임 대응 효율화가 목표.

**How to apply:** 신규 기능 기획 시 Heat No. Traceability 연계와 AI 신뢰도 점수 의무 포함 원칙을 적용한다. 모듈 3과 모듈 4는 공정이력 DB를 통해 Heat No. 기준으로 통합된다.
