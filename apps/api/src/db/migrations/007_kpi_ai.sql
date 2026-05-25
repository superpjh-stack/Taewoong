-- 007_kpi_ai.sql
-- KPI 스냅샷 및 AI Agent 세션

-- ─────────────────────────────────────────
-- kpi_daily_snapshots (KPI 일일 집계)
-- ─────────────────────────────────────────
CREATE TABLE kpi_daily_snapshots (
  id             BIGSERIAL     PRIMARY KEY,
  snapshot_date  DATE          NOT NULL,
  kpi_type       VARCHAR(30)   NOT NULL
                   CHECK (kpi_type IN ('productivity','quality','utilization','delivery')),
  metric_key     VARCHAR(50)   NOT NULL,
  -- 예: 'oee', 'defect_rate', 'throughput', 'on_time_delivery', 'reheat_rate', 'inspection_pass_rate'
  value          NUMERIC(14,4) NOT NULL,
  target_value   NUMERIC(14,4),
  unit           VARCHAR(20),                     -- '%', 'LOT', 'kWh' 등
  dimension      JSONB,                           -- { "equipment_id": 1 } 또는 { "process_type": "heating" }
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_kpi_snapshot ON kpi_daily_snapshots (snapshot_date, kpi_type, metric_key, (dimension::text));
CREATE INDEX idx_kpi_date ON kpi_daily_snapshots (snapshot_date DESC);
CREATE INDEX idx_kpi_type ON kpi_daily_snapshots (kpi_type, metric_key);

-- KPI 목표 관리
CREATE TABLE kpi_targets (
  id             BIGSERIAL     PRIMARY KEY,
  metric_key     VARCHAR(50)   NOT NULL,
  target_value   NUMERIC(14,4) NOT NULL,
  effective_from DATE          NOT NULL,
  effective_to   DATE,
  set_by         BIGINT,                          -- user_id
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_kpi_target_key ON kpi_targets (metric_key, effective_from DESC);

-- ─────────────────────────────────────────
-- ai_agent_sessions (AI Agent 세션 / 질의이력)
-- ─────────────────────────────────────────
CREATE TABLE ai_agent_sessions (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       BIGINT        NOT NULL,            -- FK → users(id), 추후 추가
  agent_type    VARCHAR(30)   NOT NULL
                  CHECK (agent_type IN ('incoming','shipping','integrated','heating_opt')),
  question      TEXT,                              -- 자연어 질의
  answer        TEXT,                              -- AI 응답 텍스트
  reasoning     JSONB,                             -- LangGraph 노드 추론 trace
  sources       JSONB,                             -- RAG 근거 문서 목록
  confidence    NUMERIC(5,4),                      -- AI 신뢰도 (0~1) — 필수 필드
  function_calls JSONB,                            -- 호출된 Tool/Function 목록
  tokens_used   INTEGER,
  latency_ms    INTEGER,
  session_id    UUID,                              -- 멀티턴 대화 세션 그룹
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_user    ON ai_agent_sessions (user_id, created_at DESC);
CREATE INDEX idx_ai_type    ON ai_agent_sessions (agent_type, created_at DESC);
CREATE INDEX idx_ai_session ON ai_agent_sessions (session_id);
-- Full-text search on questions
CREATE INDEX idx_ai_question_trgm ON ai_agent_sessions USING GIN (question gin_trgm_ops);

-- ─────────────────────────────────────────
-- notifications (알림)
-- ─────────────────────────────────────────
CREATE TABLE notifications (
  id             BIGSERIAL     PRIMARY KEY,
  target_user_id BIGINT,                           -- NULL = 브로드캐스트
  notification_type VARCHAR(30) NOT NULL,
  severity       VARCHAR(10)   NOT NULL CHECK (severity IN ('info','warning','critical')),
  title          VARCHAR(200)  NOT NULL,
  message        TEXT,
  related_entity VARCHAR(30),                      -- 'lot', 'equipment', 'shipment' 등
  related_id     BIGINT,
  is_read        BOOLEAN       NOT NULL DEFAULT false,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user    ON notifications (target_user_id, is_read, created_at DESC);
CREATE INDEX idx_notif_created ON notifications (created_at DESC);
