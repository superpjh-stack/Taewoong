-- ── ai_agent_decisions (AI 의사결정 추천) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_agent_decisions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  priority         VARCHAR(10)   NOT NULL CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')) DEFAULT 'MEDIUM',
  category         VARCHAR(60)   NOT NULL DEFAULT '일반',
  title            VARCHAR(200)  NOT NULL,
  rationale        TEXT          NOT NULL DEFAULT '',
  recommended_action TEXT        NOT NULL DEFAULT '',
  confidence_score NUMERIC(5,4)  NOT NULL DEFAULT 0.80,
  status           VARCHAR(20)   NOT NULL CHECK (status IN ('pending', 'accepted', 'deferred')) DEFAULT 'pending',
  created_by       BIGINT,
  updated_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_dec_priority  ON ai_agent_decisions (priority, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_dec_status    ON ai_agent_decisions (status, created_at DESC) WHERE deleted_at IS NULL;

-- ── ai_agent_alerts (AI 이상감지 알림) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_agent_alerts (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  severity             VARCHAR(10)   NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')) DEFAULT 'INFO',
  title                VARCHAR(200)  NOT NULL,
  message              TEXT          NOT NULL DEFAULT '',
  improvement_suggestion TEXT        NOT NULL DEFAULT '',
  related_params       JSONB         NOT NULL DEFAULT '{}',
  is_read              BOOLEAN       NOT NULL DEFAULT false,
  updated_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_alert_severity ON ai_agent_alerts (severity, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_alert_unread   ON ai_agent_alerts (is_read, created_at DESC) WHERE deleted_at IS NULL;
