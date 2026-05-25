-- 002_master_tables.sql
-- 마스터 데이터: suppliers, equipment, quality_specs

-- ─────────────────────────────────────────
-- suppliers (공급사)
-- ─────────────────────────────────────────
CREATE TABLE suppliers (
  id               BIGSERIAL     PRIMARY KEY,
  supplier_code    VARCHAR(30)   NOT NULL,
  name             VARCHAR(200)  NOT NULL,
  country          VARCHAR(50),
  quality_grade    VARCHAR(10)   CHECK (quality_grade IN ('A','B','C')),
  avg_defect_rate  NUMERIC(5,4)  NOT NULL DEFAULT 0,
  is_active        BOOLEAN       NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_suppliers_code ON suppliers (supplier_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_suppliers_grade ON suppliers (quality_grade);

-- ─────────────────────────────────────────
-- equipment (설비)
-- ─────────────────────────────────────────
CREATE TABLE equipment (
  id               BIGSERIAL     PRIMARY KEY,
  equipment_code   VARCHAR(30)   NOT NULL,
  name             VARCHAR(200)  NOT NULL,
  type             VARCHAR(30)   NOT NULL CHECK (type IN ('furnace','press','heat_treat','inspection','other')),
  status           VARCHAR(20)   NOT NULL DEFAULT 'idle'
                     CHECK (status IN ('running','idle','down','maintenance')),
  location         VARCHAR(100),
  spec             JSONB,         -- 정격용량, 온도범위 등
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_equipment_code ON equipment (equipment_code);
CREATE INDEX idx_equip_type   ON equipment (type);
CREATE INDEX idx_equip_status ON equipment (status);

-- ─────────────────────────────────────────
-- quality_specs (품질 기준 — 강종/고객사별)
-- ─────────────────────────────────────────
CREATE TABLE quality_specs (
  id               BIGSERIAL     PRIMARY KEY,
  spec_code        VARCHAR(50)   NOT NULL,
  material_type    VARCHAR(50)   NOT NULL,
  customer_code    VARCHAR(50),              -- NULL = 범용 기준
  standard         VARCHAR(30),             -- KS, ASTM, EN 등
  inspection_type  VARCHAR(30)   NOT NULL
                     CHECK (inspection_type IN ('dimension','ut','mt','hardness','tensile','visual')),
  criteria         JSONB         NOT NULL,  -- 합부 기준값 (min/max/grade)
  version          INTEGER       NOT NULL DEFAULT 1,
  is_active        BOOLEAN       NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_quality_specs ON quality_specs (spec_code, version);
CREATE INDEX idx_qs_material  ON quality_specs (material_type);
CREATE INDEX idx_qs_customer  ON quality_specs (customer_code);

-- ─────────────────────────────────────────
-- work_standards (작업 표준 / SOP)
-- ─────────────────────────────────────────
CREATE TABLE work_standards (
  id               BIGSERIAL     PRIMARY KEY,
  standard_code    VARCHAR(50)   NOT NULL,
  process_type     VARCHAR(30)   NOT NULL
                     CHECK (process_type IN ('incoming','heating','forging','heat_treatment','inspection','shipping')),
  title            VARCHAR(200)  NOT NULL,
  content          TEXT,
  attachment_url   TEXT,
  version          INTEGER       NOT NULL DEFAULT 1,
  is_active        BOOLEAN       NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_work_standards ON work_standards (standard_code, version);

-- ─────────────────────────────────────────
-- code_master (코드 마스터 — 품목/공정/설비 코드)
-- ─────────────────────────────────────────
CREATE TABLE code_master (
  id               BIGSERIAL     PRIMARY KEY,
  category         VARCHAR(50)   NOT NULL,  -- 'material_type', 'process_type', 'defect_code' 등
  code             VARCHAR(50)   NOT NULL,
  name             VARCHAR(200)  NOT NULL,
  name_en          VARCHAR(200),
  sort_order       INTEGER       NOT NULL DEFAULT 0,
  is_active        BOOLEAN       NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_code_master ON code_master (category, code);
CREATE INDEX idx_code_category ON code_master (category);
