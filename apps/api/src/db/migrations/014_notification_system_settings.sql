-- 014_notification_system_settings.sql
-- 알림 규칙 및 시스템 설정 테이블

-- ─────────────────────────────────────────
-- notification_rules
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_rules (
  id                  BIGSERIAL     PRIMARY KEY,
  name                VARCHAR(200)  NOT NULL,
  metric_key          VARCHAR(100)  NOT NULL,
  operator            VARCHAR(5)    NOT NULL CHECK (operator IN ('>', '<', '>=', '<=', '=')),
  threshold           NUMERIC(15,4) NOT NULL,
  channels            JSONB         NOT NULL DEFAULT '[]',
  target_role_codes   JSONB         NOT NULL DEFAULT '[]',
  is_active           BOOLEAN       NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- system_settings (단일 행 설정 테이블)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  id                            BIGSERIAL     PRIMARY KEY,
  factory_name                  VARCHAR(200)  NOT NULL DEFAULT '태웅 단조공장',
  language                      VARCHAR(10)   NOT NULL DEFAULT 'ko',
  timezone                      VARCHAR(60)   NOT NULL DEFAULT 'Asia/Seoul',
  date_format                   VARCHAR(30)   NOT NULL DEFAULT 'YYYY-MM-DD',
  ai_api_endpoint               TEXT          NOT NULL DEFAULT 'http://localhost:8000/api/v1',
  ai_api_timeout_ms             INT           NOT NULL DEFAULT 30000,
  default_agent_type            VARCHAR(50)   NOT NULL DEFAULT 'integrated',
  ai_confidence_display_min     NUMERIC(4,2)  NOT NULL DEFAULT 0.70,
  audit_log_retention_days      INT           NOT NULL DEFAULT 365,
  ai_history_retention_days     INT           NOT NULL DEFAULT 90,
  sensor_data_retention_days    INT           NOT NULL DEFAULT 180,
  default_notification_channels JSONB         NOT NULL DEFAULT '["email","app"]',
  notification_blackout_start   VARCHAR(8)    NOT NULL DEFAULT '22:00',
  notification_blackout_end     VARCHAR(8)    NOT NULL DEFAULT '07:00',
  updated_at                    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 기본 설정 행 삽입 (없을 때만)
INSERT INTO system_settings DEFAULT VALUES
ON CONFLICT DO NOTHING;
