---
name: project-seed-state
description: TaeWoong AI-MES DB 시드 적용 상태 및 API 수정 내역 (2026-05-25 기준)
metadata:
  type: project
---

005_screen_coverage.sql 시드 파일 생성 및 적용 완료 (2026-05-25).

**추가된 데이터:**
- heating_process_events: 52건 (기존 0 → 52)
- heating_temperature_logs: 189건 (기존 0 → 189)
- kpi_targets: 10건 (기존 0 → 10), kpi_type/unit 컬럼 포함
- ai_agent_decisions: 10건 (기존 0 → 10)
- ai_agent_alerts: 10건 (기존 0 → 10)
- data_sources: 10건 (기존 0 → 10)
- ai_datasets: 10건 (기존 0 → 10)
- notification_rules: 10건 (기존 0 → 10)
- code_master: 42건 (16 → 42), 강종/공정/KPI/고객사 코드 추가
- lots: 15건 (10 → 15), heating_processes: 15건, process_results: 16건, quality_inspections: 20건, shipments: 13건
- kpi_daily_snapshots: 30건 (10 → 30)

**DB 컬럼 추가 (API 코드와 스키마 동기화):**
- heating_recipes: recipe_name(generated), material_grade(generated), heating_minutes(generated), soaking_minutes(generated), zone_temps(generated), deleted_at 추가
- lots: raw_material_id, deleted_at 추가
- heating_processes status 컬럼: ended_at 있으면 completed로 업데이트

**API 코드 수정:**
- apps/api/src/services/heating-service.ts: r.recipe_name → COALESCE(r.recipe_code, r.material_type) AS recipe_name

**Why:** 004 마이그레이션(recipe_code 기반)과 011 마이그레이션(recipe_name 기반) 간 스키마 불일치로 API 500 오류 발생.

**How to apply:** 향후 마이그레이션 작성 시 기존 테이블의 실제 컬럼명과 API 서비스 코드 참조 컬럼을 반드시 대조 확인.
