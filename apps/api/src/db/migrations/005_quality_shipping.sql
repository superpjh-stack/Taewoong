-- 005_quality_shipping.sql
-- 품질 검사 및 출하

-- ─────────────────────────────────────────
-- quality_inspections (검사 결과)
-- ─────────────────────────────────────────
CREATE TABLE quality_inspections (
  id                BIGSERIAL     PRIMARY KEY,
  lot_id            BIGINT        NOT NULL REFERENCES lots(id),
  inspection_type   VARCHAR(30)   NOT NULL
                      CHECK (inspection_type IN ('dimension','ut','mt','hardness','tensile','visual','chemical')),
  spec_id           BIGINT        REFERENCES quality_specs(id),
  measured_values   JSONB,                         -- 측정값 { "tensile_mpa": 620, "yield_mpa": 480, ... }
  result            VARCHAR(20)   NOT NULL
                      CHECK (result IN ('pass','fail','conditional')),
  defect_codes      TEXT[],                        -- 불량 코드 배열
  defect_description TEXT,
  ai_anomaly_score  NUMERIC(5,4),                  -- AI 이상탐지 점수 (0~1, 높을수록 이상)
  inspector_id      BIGINT,
  inspected_at      TIMESTAMPTZ   NOT NULL,
  certificate_url   TEXT,                          -- 검사성적서 파일 URL
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_qi_lot        ON quality_inspections (lot_id);
CREATE INDEX idx_qi_result     ON quality_inspections (result);
CREATE INDEX idx_qi_type       ON quality_inspections (inspection_type);
CREATE INDEX idx_qi_inspected  ON quality_inspections (inspected_at DESC);

-- ─────────────────────────────────────────
-- shipments (출하)
-- ─────────────────────────────────────────
CREATE TABLE shipments (
  id               BIGSERIAL     PRIMARY KEY,
  shipment_no      VARCHAR(50)   NOT NULL,
  lot_id           BIGINT        NOT NULL REFERENCES lots(id),
  customer_code    VARCHAR(50)   NOT NULL,
  customer_order_no VARCHAR(100),                 -- 고객 발주번호
  quantity         INTEGER       NOT NULL,
  weight_kg        NUMERIC(12,2),
  due_date         DATE,
  ship_status      VARCHAR(20)   NOT NULL DEFAULT 'ready'
                     CHECK (ship_status IN ('ready','approved','shipped','held','cancelled')),
  hold_reason      TEXT,
  ai_judgement     JSONB,                         -- { "decision": "approve", "confidence": 0.952, "risks": [...] }
  ai_confidence    NUMERIC(5,4),
  approved_by      BIGINT,
  approved_at      TIMESTAMPTZ,
  shipped_at       TIMESTAMPTZ,
  delivery_note_url TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_shipments_no   ON shipments (shipment_no);
CREATE INDEX idx_ship_lot             ON shipments (lot_id);
CREATE INDEX idx_ship_status          ON shipments (ship_status);
CREATE INDEX idx_ship_customer        ON shipments (customer_code);
CREATE INDEX idx_ship_due_date        ON shipments (due_date);

-- ─────────────────────────────────────────
-- claims (클레임)
-- ─────────────────────────────────────────
CREATE TABLE claims (
  id               BIGSERIAL     PRIMARY KEY,
  claim_no         VARCHAR(50)   NOT NULL,
  shipment_id      BIGINT        REFERENCES shipments(id),
  lot_id           BIGINT        NOT NULL REFERENCES lots(id),
  customer_code    VARCHAR(50)   NOT NULL,
  claim_type       VARCHAR(30)   CHECK (claim_type IN ('dimension','surface','mechanical','ndt','delivery','other')),
  description      TEXT          NOT NULL,
  root_cause       TEXT,
  corrective_action TEXT,
  status           VARCHAR(20)   NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','investigating','resolved','closed')),
  severity         VARCHAR(10)   CHECK (severity IN ('low','medium','high','critical')),
  occurred_at      TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_claims_no ON claims (claim_no);
CREATE INDEX idx_claims_lot       ON claims (lot_id);
CREATE INDEX idx_claims_status    ON claims (status);
