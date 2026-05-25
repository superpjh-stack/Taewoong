-- 012_performance_indexes.sql
-- API 응답속도 1초 미만 보장을 위한 인덱스 추가

-- pg_trgm: lot_no ILIKE '%keyword%' 검색 지원
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- lots: created_at (KPI productivity trend, data-management query, dashboard today_created)
CREATE INDEX IF NOT EXISTS idx_lots_created ON lots (created_at DESC);

-- lots: lot_no GIN trigram (data-management ILIKE 검색)
CREATE INDEX IF NOT EXISTS idx_lots_lotno_trgm ON lots USING GIN (lot_no gin_trgm_ops);

-- quality_inspections: created_at (KPI quality, trend, defect-distribution, cpk-by-process, data-visualization correlation)
CREATE INDEX IF NOT EXISTS idx_qi_created ON quality_inspections (created_at DESC);

-- heating_temperature_logs: recorded_at 단독 (data-visualization timeseries 전체 시간 범위 집계)
CREATE INDEX IF NOT EXISTS idx_htl_recorded ON heating_temperature_logs (recorded_at);

-- shipments: created_at (shipment list ORDER BY, date filter)
CREATE INDEX IF NOT EXISTS idx_ship_created ON shipments (created_at DESC);

-- heating_processes: started_at::date은 timezone 의존성으로 IMMUTABLE 불가 → started_at DESC 인덱스 활용
-- (idx_hp_started 가 004에서 이미 생성됨, 별도 date 인덱스 불필요)

-- lots: raw_material_id는 heat_materials 테이블에 있으며 idx_hm_raw_material(003)에서 이미 생성됨
-- idx_hm_raw_material ON heat_materials (raw_material_id)

-- quality_inspections: (created_at, judgement) 복합 (kpi quality 필터+집계 공동)
CREATE INDEX IF NOT EXISTS idx_qi_created_judgement ON quality_inspections (created_at DESC, judgement) WHERE deleted_at IS NULL;
