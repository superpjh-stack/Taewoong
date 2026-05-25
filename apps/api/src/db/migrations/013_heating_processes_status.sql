-- 013_heating_processes_status.sql
-- heating_processes 테이블에 status, completed_at 컬럼 추가
-- (기존 ended_at을 완료 시각으로 사용하며 completed_at을 동기화 계산 컬럼으로 추가)

DO $$
BEGIN
  -- status 컬럼: 'in_progress' 또는 'completed'
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='heating_processes' AND column_name='status') THEN
    ALTER TABLE heating_processes ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
      CHECK (status IN ('in_progress', 'completed'));
    -- 기존 데이터 중 ended_at이 있는 행을 completed로 업데이트
    UPDATE heating_processes SET status = 'completed' WHERE ended_at IS NOT NULL;
  END IF;

  -- completed_at 컬럼: ended_at 의 별칭 (독립 컬럼으로 저장)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='heating_processes' AND column_name='completed_at') THEN
    ALTER TABLE heating_processes ADD COLUMN completed_at TIMESTAMPTZ;
    -- 기존 ended_at 값 복사
    UPDATE heating_processes SET completed_at = ended_at WHERE ended_at IS NOT NULL;
  END IF;
END
$$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_hp_status ON heating_processes (status);
CREATE INDEX IF NOT EXISTS idx_hp_completed ON heating_processes (completed_at DESC) WHERE completed_at IS NOT NULL;
