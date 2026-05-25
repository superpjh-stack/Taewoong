-- 004_process_tables.sql
-- 공정 테이블: heating_recipes, heating_processes, process_results

-- ─────────────────────────────────────────
-- heating_recipes (가열 레시피 / 작업조건 표준)
-- ─────────────────────────────────────────
CREATE TABLE heating_recipes (
  id                BIGSERIAL     PRIMARY KEY,
  recipe_code       VARCHAR(30)   NOT NULL,
  material_type     VARCHAR(50)   NOT NULL,        -- 강종
  product_spec      VARCHAR(100),                  -- 적용 규격 (직경범위 등)
  preheat_temp_c    NUMERIC(6,1),                  -- 예열 온도
  target_temp_c     NUMERIC(6,1)  NOT NULL,        -- 목표 가열 온도
  soak_temp_c       NUMERIC(6,1),                  -- 균열 온도
  ramp_rate_c_min   NUMERIC(6,2),                  -- 승온속도 (°C/min)
  soak_time_min     INTEGER,                       -- 균열 유지시간 (분)
  max_charge_kg     NUMERIC(12,2),
  zone_profiles     JSONB,                         -- 존별 세부 설정 [ { zone: "preheat", temp_c: 850 }, ... ]
  version           INTEGER       NOT NULL DEFAULT 1,
  is_active         BOOLEAN       NOT NULL DEFAULT true,
  approved_by       BIGINT,                        -- 승인자 user_id
  approved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_heating_recipes ON heating_recipes (recipe_code, version);
CREATE INDEX idx_recipe_material       ON heating_recipes (material_type);
CREATE INDEX idx_recipe_active         ON heating_recipes (is_active);

-- ─────────────────────────────────────────
-- heating_processes (가열공정 실적)
-- ─────────────────────────────────────────
CREATE TABLE heating_processes (
  id                    BIGSERIAL     PRIMARY KEY,
  lot_id                BIGINT        NOT NULL REFERENCES lots(id),
  equipment_id          BIGINT        NOT NULL REFERENCES equipment(id),
  recipe_id             BIGINT        REFERENCES heating_recipes(id),
  started_at            TIMESTAMPTZ   NOT NULL,
  ended_at              TIMESTAMPTZ,
  actual_max_temp_c     NUMERIC(6,1),
  actual_preheat_temp_c NUMERIC(6,1),
  actual_soak_time_min  INTEGER,
  energy_kwh            NUMERIC(12,2),
  zone_actuals          JSONB,                     -- 존별 실측 데이터
  reheat_count          SMALLINT      NOT NULL DEFAULT 0,  -- 재가열 횟수
  ai_optimization       JSONB,                     -- ML 권고값 { "confidence": 0.947, "rec_temp_c": 1220, ... }
  operator_id           BIGINT,                              -- users FK는 008_rbac.sql 이후 추가 (순서 의존성)
  notes                 TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_hp_lot       ON heating_processes (lot_id);
CREATE INDEX idx_hp_equip     ON heating_processes (equipment_id);
CREATE INDEX idx_hp_started   ON heating_processes (started_at DESC);

-- ─────────────────────────────────────────
-- process_results (단조/열처리/기계가공 공정 실적 — 범용)
-- ─────────────────────────────────────────
CREATE TABLE process_results (
  id               BIGSERIAL     PRIMARY KEY,
  lot_id           BIGINT        NOT NULL REFERENCES lots(id),
  process_type     VARCHAR(30)   NOT NULL
                     CHECK (process_type IN ('forging','heat_treatment','machining','straightening','other')),
  equipment_id     BIGINT        REFERENCES equipment(id),
  work_order_no    VARCHAR(50),
  sequence_no      SMALLINT      NOT NULL DEFAULT 1,  -- 동일 공정 반복 시 순번
  parameters       JSONB,                            -- 공정 조건 실적 (온도, 압력, 속도 등)
  result_status    VARCHAR(20)   NOT NULL DEFAULT 'ok'
                     CHECK (result_status IN ('ok','ng','rework','scrap')),
  ng_reason        TEXT,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  operator_id      BIGINT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_pr_lot     ON process_results (lot_id);
CREATE INDEX idx_pr_type    ON process_results (process_type);
CREATE INDEX idx_pr_started ON process_results (started_at DESC);
CREATE INDEX idx_pr_result  ON process_results (result_status);
