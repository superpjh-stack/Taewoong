-- 003_traceability_core.sql
-- 트레이서빌리티 핵심: raw_materials, heats, heat_materials, lots, lot_lineage

-- ─────────────────────────────────────────
-- raw_materials (원자재 / 입고)
-- ─────────────────────────────────────────
CREATE TABLE raw_materials (
  id                   BIGSERIAL     PRIMARY KEY,
  material_lot_no      VARCHAR(50)   NOT NULL,     -- 입고 LOT 번호 (사내 채번)
  supplier_id          BIGINT        NOT NULL REFERENCES suppliers(id),
  material_type        VARCHAR(50)   NOT NULL,     -- 강종 코드 (SM45C, SCM440 등)
  heat_no_supplier     VARCHAR(50),               -- 공급사 제강 Heat No. (밀시트 기준)
  weight_kg            NUMERIC(12,2) NOT NULL,
  chemical_composition JSONB,                      -- { "C": 0.43, "Si": 0.24, "Mn": 0.71, "P": 0.015, "S": 0.008 }
  mill_cert_url        TEXT,                       -- 밀시트 파일 URL
  received_at          TIMESTAMPTZ   NOT NULL,
  inspection_status    VARCHAR(20)   NOT NULL DEFAULT 'pending'
                         CHECK (inspection_status IN ('pending','passed','rejected')),
  rejection_reason     TEXT,
  ai_judgement         JSONB,                      -- { "result": "pass", "confidence": 0.963, "reasons": [...] }
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_raw_materials_lot ON raw_materials (material_lot_no);
CREATE INDEX idx_rm_supplier  ON raw_materials (supplier_id);
CREATE INDEX idx_rm_received  ON raw_materials (received_at DESC);
CREATE INDEX idx_rm_status    ON raw_materials (inspection_status);
CREATE INDEX idx_rm_chem      ON raw_materials USING GIN (chemical_composition);

-- ─────────────────────────────────────────
-- heats (Heat No. — 배합/제강 단위)
-- ─────────────────────────────────────────
CREATE TABLE heats (
  id                   BIGSERIAL     PRIMARY KEY,
  heat_no              VARCHAR(50)   NOT NULL,     -- 사내 Heat No. (예: HN-2024-1234)
  material_type        VARCHAR(50)   NOT NULL,
  target_composition   JSONB,                      -- 목표 성분비
  actual_composition   JSONB,                      -- 실측 성분비
  total_weight_kg      NUMERIC(12,2),
  charged_at           TIMESTAMPTZ,               -- 배합 일시
  status               VARCHAR(20)   NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open','closed')),
  notes                TEXT,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_heats_no       ON heats (heat_no);
CREATE INDEX idx_heats_material       ON heats (material_type);
CREATE INDEX idx_heats_charged        ON heats (charged_at DESC);

-- ─────────────────────────────────────────
-- heat_materials (Heat ↔ 원자재 N:M 배합)
-- ─────────────────────────────────────────
CREATE TABLE heat_materials (
  id               BIGSERIAL     PRIMARY KEY,
  heat_id          BIGINT        NOT NULL REFERENCES heats(id),
  raw_material_id  BIGINT        NOT NULL REFERENCES raw_materials(id),
  charge_weight_kg NUMERIC(12,2) NOT NULL,         -- 해당 원자재에서 투입한 중량
  charge_ratio     NUMERIC(5,4),                  -- 투입 비율 (0~1)
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_heat_materials ON heat_materials (heat_id, raw_material_id);
CREATE INDEX idx_hm_raw_material      ON heat_materials (raw_material_id);
-- 역추적 경로: LOT → heat → heat_materials → raw_materials → suppliers

-- ─────────────────────────────────────────
-- lots (LOT 번호)
-- ─────────────────────────────────────────
CREATE TABLE lots (
  id               BIGSERIAL     PRIMARY KEY,
  lot_no           VARCHAR(50)   NOT NULL,         -- 사내 LOT 번호 (예: LOT-2024-0892)
  heat_id          BIGINT        NOT NULL REFERENCES heats(id),
  parent_lot_id    BIGINT        REFERENCES lots(id), -- 분할/병합 원본 LOT
  product_code     VARCHAR(50)   NOT NULL,
  product_name     VARCHAR(200),
  quantity         INTEGER       NOT NULL DEFAULT 1,
  weight_kg        NUMERIC(12,2),
  spec             JSONB,                          -- 규격 { "diameter_mm": 800, "length_mm": 120 }
  current_stage    VARCHAR(30)   NOT NULL DEFAULT 'incoming'
                     CHECK (current_stage IN ('incoming','heating','forging','heat_treatment','inspection','shipped')),
  status           VARCHAR(20)   NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','hold','scrapped','shipped')),
  customer_code    VARCHAR(50),
  due_date         DATE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_lots_no        ON lots (lot_no);
CREATE INDEX idx_lots_heat            ON lots (heat_id);
CREATE INDEX idx_lots_stage           ON lots (current_stage);
CREATE INDEX idx_lots_status          ON lots (status);
CREATE INDEX idx_lots_customer        ON lots (customer_code);
CREATE INDEX idx_lots_due_date        ON lots (due_date);

-- ─────────────────────────────────────────
-- lot_lineage (LOT 계보 — Closure Table)
-- 분할/병합/재작업의 모든 계보를 단일 테이블로 추적
-- depth=0: self, depth=1: 직계 부모, depth=N: N단계 선조
-- ─────────────────────────────────────────
CREATE TABLE lot_lineage (
  ancestor_id    BIGINT  NOT NULL REFERENCES lots(id),
  descendant_id  BIGINT  NOT NULL REFERENCES lots(id),
  depth          INTEGER NOT NULL CHECK (depth >= 0),
  PRIMARY KEY (ancestor_id, descendant_id)
);
CREATE INDEX idx_lineage_descendant ON lot_lineage (descendant_id);
CREATE INDEX idx_lineage_ancestor   ON lot_lineage (ancestor_id);

-- LOT 삽입 시 Closure Table 자동 갱신 함수
CREATE OR REPLACE FUNCTION fn_insert_lot_lineage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- self row
  INSERT INTO lot_lineage (ancestor_id, descendant_id, depth)
  VALUES (NEW.id, NEW.id, 0);

  -- 부모가 있으면 부모의 모든 선조 → 새 LOT 경로 삽입
  IF NEW.parent_lot_id IS NOT NULL THEN
    INSERT INTO lot_lineage (ancestor_id, descendant_id, depth)
    SELECT l.ancestor_id, NEW.id, l.depth + 1
    FROM lot_lineage l
    WHERE l.descendant_id = NEW.parent_lot_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lot_lineage
AFTER INSERT ON lots
FOR EACH ROW EXECUTE FUNCTION fn_insert_lot_lineage();
