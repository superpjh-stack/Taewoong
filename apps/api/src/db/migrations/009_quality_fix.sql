-- 009_quality_fix.sql
-- quality_inspections 테이블에 애플리케이션 서비스가 필요로 하는 컬럼 추가

ALTER TABLE quality_inspections
  ADD COLUMN IF NOT EXISTS insp_type        VARCHAR(10)
    CHECK (insp_type IN ('UT','VT','DM','HRD')),
  ADD COLUMN IF NOT EXISTS insp_status      VARCHAR(20)   NOT NULL DEFAULT 'pending'
    CHECK (insp_status IN ('pending','passed','failed')),
  ADD COLUMN IF NOT EXISTS judgement        VARCHAR(10)
    CHECK (judgement IN ('pass','fail')),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS judged_by        BIGINT        REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS judged_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at       TIMESTAMPTZ;

-- shipments 테이블 soft delete 지원 추가
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_qi_insp_status ON quality_inspections (insp_status);
CREATE INDEX IF NOT EXISTS idx_qi_deleted      ON quality_inspections (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ship_deleted    ON shipments (deleted_at) WHERE deleted_at IS NULL;
