-- 011_data_management_tables.sql
-- 데이터관리 / AI학습 / 가열레시피 / KPI 확장

-- ── heating_recipes ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS heating_recipes (
  id                BIGSERIAL     PRIMARY KEY,
  recipe_name       VARCHAR(100)  NOT NULL UNIQUE,
  material_grade    VARCHAR(50)   NOT NULL,
  zone_temps        JSONB         NOT NULL DEFAULT '{}',
  heating_minutes   INTEGER       NOT NULL CHECK (heating_minutes > 0),
  soaking_minutes   INTEGER       NOT NULL CHECK (soaking_minutes > 0),
  status            VARCHAR(20)   NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  note              TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
-- heating_recipes는 004에서 material_type 컬럼으로 이미 생성됨
CREATE INDEX IF NOT EXISTS idx_heating_recipes_material ON heating_recipes (material_type);
CREATE INDEX IF NOT EXISTS idx_heating_recipes_active   ON heating_recipes (is_active);

-- ── heating_process_events ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS heating_process_events (
  id                    BIGSERIAL     PRIMARY KEY,
  heating_process_id    BIGINT        NOT NULL,
  event_type            VARCHAR(50)   NOT NULL CHECK (event_type IN ('charged','target_reached','soaking_done','discharged')),
  event_label           VARCHAR(100),
  occurred_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hpe_process ON heating_process_events (heating_process_id, occurred_at);

-- ── heating_temperature_logs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS heating_temperature_logs (
  id                    BIGSERIAL     PRIMARY KEY,
  heating_process_id    BIGINT        NOT NULL,
  equipment_id          BIGINT        NOT NULL,
  zone_no               INTEGER       NOT NULL,
  current_temp          NUMERIC(8,2)  NOT NULL,
  target_temp           NUMERIC(8,2)  NOT NULL DEFAULT 0,
  recorded_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_htl_process ON heating_temperature_logs (heating_process_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_htl_equipment ON heating_temperature_logs (equipment_id, recorded_at DESC);

-- ── data_sources ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_sources (
  id                    BIGSERIAL     PRIMARY KEY,
  name                  VARCHAR(200)  NOT NULL,
  process_stage         VARCHAR(50)   NOT NULL CHECK (process_stage IN ('incoming','heating','forging','heat_treatment','inspection','shipped')),
  table_or_channel      VARCHAR(200)  NOT NULL,
  collect_interval_sec  INTEGER       NOT NULL DEFAULT 60,
  status                VARCHAR(20)   NOT NULL DEFAULT 'normal' CHECK (status IN ('normal','delayed','error')),
  last_collected_at     TIMESTAMPTZ,
  description           TEXT,
  is_active             BOOLEAN       NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

-- ── data_export_jobs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_export_jobs (
  job_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         BIGINT,
  data_type       VARCHAR(50)   NOT NULL CHECK (data_type IN ('lot','sensor','quality','shipment')),
  date_from       DATE          NOT NULL,
  date_to         DATE          NOT NULL,
  stage           VARCHAR(50),
  status_filter   VARCHAR(50),
  status          VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  requested_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  file_url        TEXT,
  row_count       INTEGER,
  error_message   TEXT
);
CREATE INDEX IF NOT EXISTS idx_export_user ON data_export_jobs (user_id, requested_at DESC);

-- ── ai_datasets ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_datasets (
  id                  BIGSERIAL     PRIMARY KEY,
  name                VARCHAR(200)  NOT NULL,
  version             VARCHAR(50)   NOT NULL,
  target_model        VARCHAR(100)  NOT NULL,
  sample_count        INTEGER       NOT NULL DEFAULT 0,
  missing_rate        NUMERIC(5,4)  NOT NULL DEFAULT 0,
  outlier_rate        NUMERIC(5,4)  NOT NULL DEFAULT 0,
  date_range_start    DATE          NOT NULL,
  date_range_end      DATE          NOT NULL,
  description         TEXT,
  created_by          VARCHAR(100)  NOT NULL DEFAULT 'system',
  status              VARCHAR(20)   NOT NULL DEFAULT 'active' CHECK (status IN ('active','deprecated','in-review')),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_dataset_model ON ai_datasets (target_model, status);

-- ── kpi_targets 컬럼 추가 (기존 테이블에 kpi_type, unit, created_by 없으면 추가) ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kpi_targets' AND column_name='kpi_type') THEN
    ALTER TABLE kpi_targets ADD COLUMN kpi_type VARCHAR(30) NOT NULL DEFAULT 'production';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kpi_targets' AND column_name='unit') THEN
    ALTER TABLE kpi_targets ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT '%';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kpi_targets' AND column_name='created_by') THEN
    ALTER TABLE kpi_targets ADD COLUMN created_by BIGINT;
  END IF;
END
$$;

-- ── kpi_target_history ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kpi_target_history (
  id              BIGSERIAL     PRIMARY KEY,
  kpi_target_id   BIGINT        NOT NULL,
  old_value       NUMERIC(14,4) NOT NULL,
  new_value       NUMERIC(14,4) NOT NULL,
  changed_by      BIGINT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── equipment last_status 컬럼 추가 ──────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='equipment' AND column_name='last_status') THEN
    ALTER TABLE equipment ADD COLUMN last_status VARCHAR(20) DEFAULT 'idle';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='equipment' AND column_name='equipment_type') THEN
    ALTER TABLE equipment ADD COLUMN equipment_type VARCHAR(50) DEFAULT 'furnace';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='equipment' AND column_name='deleted_at') THEN
    ALTER TABLE equipment ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END
$$;

-- ── heating_processes 컬럼 추가 ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='heating_processes' AND column_name='recipe_id') THEN
    ALTER TABLE heating_processes ADD COLUMN recipe_id BIGINT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='heating_processes' AND column_name='has_anomaly') THEN
    ALTER TABLE heating_processes ADD COLUMN has_anomaly BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='heating_processes' AND column_name='anomaly_type') THEN
    ALTER TABLE heating_processes ADD COLUMN anomaly_type VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='heating_processes' AND column_name='anomaly_occurred_at') THEN
    ALTER TABLE heating_processes ADD COLUMN anomaly_occurred_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='heating_processes' AND column_name='temperature_deviation') THEN
    ALTER TABLE heating_processes ADD COLUMN temperature_deviation NUMERIC(8,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='heating_processes' AND column_name='reheat_count') THEN
    ALTER TABLE heating_processes ADD COLUMN reheat_count INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='heating_processes' AND column_name='deleted_at') THEN
    ALTER TABLE heating_processes ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END
$$;

-- ── quality_specs, work_standards, code_master 테이블 (없으면 생성) ──────────
CREATE TABLE IF NOT EXISTS quality_specs (
  id              BIGSERIAL     PRIMARY KEY,
  spec_code       VARCHAR(100)  NOT NULL UNIQUE,
  material_type   VARCHAR(100)  NOT NULL,
  customer_code   VARCHAR(100),
  standard        TEXT,
  inspection_type VARCHAR(50)   NOT NULL,
  criteria        TEXT          NOT NULL,
  version         INTEGER       NOT NULL DEFAULT 1,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_standards (
  id              BIGSERIAL     PRIMARY KEY,
  standard_code   VARCHAR(100)  NOT NULL UNIQUE,
  process_type    VARCHAR(100)  NOT NULL,
  title           VARCHAR(200)  NOT NULL,
  content         TEXT,
  attachment_url  TEXT,
  version         INTEGER       NOT NULL DEFAULT 1,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS code_master (
  id              BIGSERIAL     PRIMARY KEY,
  category        VARCHAR(100)  NOT NULL,
  code            VARCHAR(100)  NOT NULL,
  name            VARCHAR(200)  NOT NULL,
  name_en         VARCHAR(200),
  sort_order      INTEGER       NOT NULL DEFAULT 0,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (category, code)
);
CREATE INDEX IF NOT EXISTS idx_code_master_cat ON code_master (category, sort_order);

-- ── reference-info 권한 (master:read/write → reference:read/write alias) ─────
INSERT INTO permissions (perm_code, resource, action, description) VALUES
  ('master:read',  'reference_info', 'read',  '기준정보 조회'),
  ('master:write', 'reference_info', 'write', '기준정보 관리')
ON CONFLICT (perm_code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_code = 'admin'
  AND p.perm_code IN ('master:read', 'master:write')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_code IN ('process', 'quality')
  AND p.perm_code = 'master:read'
ON CONFLICT DO NOTHING;
