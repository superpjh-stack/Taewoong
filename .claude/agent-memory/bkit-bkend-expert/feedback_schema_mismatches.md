---
name: feedback-schema-mismatches
description: TaeWoong MES API 코드와 DB 스키마 불일치 패턴 — 발견된 컬럼명 차이 목록
metadata:
  type: feedback
---

API 코드가 DB에 없는 컬럼을 참조해 INTERNAL_ERROR 500이 발생하는 패턴이 반복됨.

**Why:** 004 마이그레이션(원본 스키마)과 011 마이그레이션(다른 컬럼명으로 재정의 시도) 간 불일치. CREATE TABLE IF NOT EXISTS이므로 이미 존재하면 원본 스키마 유지됨.

**확인된 불일치 목록:**
- heating_recipes.recipe_name → 실제: recipe_code
- heating_recipes.material_grade → 실제: material_type
- heating_recipes.heating_minutes → 실제: soak_time_min
- heating_recipes.zone_temps → 실제: zone_profiles
- quality_inspections.judgement → 실제: result (generated column으로 해결)
- quality_inspections.insp_type → 실제: inspection_type (generated column으로 해결)
- quality_inspections.rejection_reason → 실제: defect_description (generated)
- lots.raw_material_id → 없음 (ALTER TABLE로 추가)
- lots.deleted_at → 없음 (ALTER TABLE로 추가)

**해결책:** DB에 generated/alias 컬럼을 ALTER TABLE로 추가, 또는 API 코드에서 실제 컬럼명 사용.

**How to apply:** 새 API 엔드포인트 개발 시 반드시 실제 DB 스키마를 `\d tablename`으로 확인 후 코드 작성.
