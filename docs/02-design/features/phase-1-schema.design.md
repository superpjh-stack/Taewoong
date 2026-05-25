# [Design] phase-1-schema — 태웅 AI-MES 도메인 스키마 설계

| 항목 | 내용 |
|------|------|
| Feature | phase-1-schema |
| Phase | Design (PDCA Phase 1) |
| 작성일 | 2026-05-20 |
| 근거 문서 | docs/02-design/system-architecture.md |

## 1. 도메인 용어 정의

| 용어 | 영문 | 정의 |
|------|------|------|
| Heat No. | Heat Number | 제강(용해/배합) 단위 식별자. 동일 Heat에서 여러 LOT 파생. |
| LOT | Lot | 제품 추적의 기본 단위. 분할/병합 가능. |
| 입고 | Incoming | 원자재(빌렛·블룸) 수령 및 성분 검수 단계 |
| 가열 | Heating | 가열로(Furnace)에서 단조 전 소재를 가열하는 공정 |
| 단조 | Forging | 프레스/해머로 형상을 성형하는 공정 |
| 열처리 | Heat Treatment | 기계적 성질 확보를 위한 열처리 공정 |
| 검사 | Inspection | NDT(비파괴) + 기계적 성질 검사 |
| 출하 | Shipment | 고객사 납품 |
| 밀시트 | Mill Certificate | 원자재 성분·규격 성적서 |
| 레시피 | Heating Recipe | 강종별 가열 조건 표준 (온도·유지시간·승온속도) |
| 클레임 | Claim | 고객 품질 이의 제기 |
| NDT | Non-Destructive Test | 비파괴검사 (UT 초음파, MT 자분 등) |
| Traceability | 추적성 | LOT → Heat → 원자재 → 공급사 역추적 능력 |

## 2. 엔티티 관계 요약

```
suppliers
    ↓ 1:N
raw_materials ──────────────┐
                            │ N:M (heat_materials)
heats ──────────────────────┘
    ↓ 1:N
lots ←──── lot_lineage (Closure Table, self-referencing)
    ↓ 1:N          ↓ 1:N              ↓ 1:N
heating_processes  process_results    quality_inspections
    ↑                   ↑
equipment          equipment
    ↑
equipment_sensor_data (TimescaleDB hypertable)
    
lots ────→ shipments

users ←── user_roles ←── roles ←── role_permissions ←── permissions
users ────→ audit_logs
users ────→ ai_agent_sessions
```

## 3. 구현 파일 목록

| 파일 | 내용 |
|------|------|
| `apps/api/src/db/migrations/001_extensions.sql` | PostgreSQL 확장 (timescaledb, pgvector, uuid-ossp) |
| `apps/api/src/db/migrations/002_master_tables.sql` | suppliers, equipment, quality_specs |
| `apps/api/src/db/migrations/003_traceability_core.sql` | raw_materials, heats, heat_materials, lots, lot_lineage |
| `apps/api/src/db/migrations/004_process_tables.sql` | heating_recipes, heating_processes, process_results |
| `apps/api/src/db/migrations/005_quality_shipping.sql` | quality_inspections, shipments |
| `apps/api/src/db/migrations/006_timescale.sql` | equipment_sensor_data (hypertable), sensor_1min view |
| `apps/api/src/db/migrations/007_kpi_ai.sql` | kpi_daily_snapshots, ai_agent_sessions |
| `apps/api/src/db/migrations/008_rbac.sql` | users, roles, permissions, user_roles, role_permissions, audit_logs |
| `apps/api/src/db/seeds/001_master_data.sql` | 초기 마스터 데이터 |
| `packages/types/src/domain.ts` | TypeScript 타입 정의 |
| `packages/types/src/api.ts` | API 요청/응답 타입 |

## 4. 수용 기준 (Acceptance Criteria)

- [ ] 모든 마이그레이션이 순서대로 오류 없이 실행된다
- [ ] `lot_lineage` Closure Table로 임의 깊이 LOT 계보 조회가 단일 쿼리로 동작한다
- [ ] `equipment_sensor_data`가 TimescaleDB hypertable로 생성되고 `sensor_1min` 연속 집계가 동작한다
- [ ] RBAC: 4개 역할(admin/process/quality/viewer)과 권한이 시드 데이터로 삽입된다
- [ ] 모든 AI 산출물 테이블에 `confidence NUMERIC(5,4)` 컬럼이 존재한다
- [ ] TypeScript 타입이 SQL 스키마와 일치한다 (컬럼명·타입)
