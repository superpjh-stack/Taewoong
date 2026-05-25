-- 006_timescale.sql
-- TimescaleDB 하이퍼테이블: 설비 센서 데이터

-- ─────────────────────────────────────────
-- equipment_sensor_data (TimescaleDB Hypertable)
-- ─────────────────────────────────────────
CREATE TABLE equipment_sensor_data (
  ts            TIMESTAMPTZ      NOT NULL,
  equipment_id  BIGINT           NOT NULL REFERENCES equipment(id),
  sensor_key    VARCHAR(50)      NOT NULL,   -- 'zone1_temp', 'zone2_temp', 'vibration', 'current', 'pressure'
  value         DOUBLE PRECISION NOT NULL,
  quality_flag  SMALLINT         NOT NULL DEFAULT 0  -- 0=good, 1=suspect, 2=bad
);

SELECT create_hypertable(
  'equipment_sensor_data', 'ts',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => true
);

CREATE INDEX idx_sensor_equip_ts
  ON equipment_sensor_data (equipment_id, sensor_key, ts DESC);

-- 압축 활성화 (add_compression_policy 전 필수)
ALTER TABLE equipment_sensor_data SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'equipment_id, sensor_key'
);

-- 데이터 보존 정책: 원시 데이터 90일 후 압축
SELECT add_compression_policy('equipment_sensor_data', INTERVAL '90 days');
-- 1년 후 삭제 (집계뷰는 영구 보존)
SELECT add_retention_policy('equipment_sensor_data', INTERVAL '1 year');

-- ─────────────────────────────────────────
-- sensor_1min (1분 평균 연속 집계뷰)
-- 대시보드 트렌드, ML 피처 추출용
-- ─────────────────────────────────────────
CREATE MATERIALIZED VIEW sensor_1min
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 minute', ts)  AS bucket,
  equipment_id,
  sensor_key,
  avg(value)                   AS avg_v,
  max(value)                   AS max_v,
  min(value)                   AS min_v,
  count(*)                     AS sample_count
FROM equipment_sensor_data
WHERE quality_flag = 0
GROUP BY bucket, equipment_id, sensor_key
WITH NO DATA;

SELECT add_continuous_aggregate_policy(
  'sensor_1min',
  start_offset  => INTERVAL '2 hours',
  end_offset    => INTERVAL '1 minute',
  schedule_interval => INTERVAL '1 minute'
);

-- sensor_5min (5분 집계 — 장기 트렌드용)
CREATE MATERIALIZED VIEW sensor_5min
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('5 minutes', bucket) AS bucket,
  equipment_id,
  sensor_key,
  avg(avg_v)   AS avg_v,
  max(max_v)   AS max_v,
  min(min_v)   AS min_v
FROM sensor_1min
GROUP BY time_bucket('5 minutes', bucket), equipment_id, sensor_key
WITH NO DATA;

SELECT add_continuous_aggregate_policy(
  'sensor_5min',
  start_offset  => INTERVAL '1 day',
  end_offset    => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '5 minutes'
);

-- ─────────────────────────────────────────
-- 설비 이상 이벤트 로그
-- ─────────────────────────────────────────
CREATE TABLE equipment_alerts (
  id             BIGSERIAL     PRIMARY KEY,
  equipment_id   BIGINT        NOT NULL REFERENCES equipment(id),
  alert_type     VARCHAR(30)   NOT NULL
                   CHECK (alert_type IN ('temp_high','temp_low','temp_deviation','vibration','current','pressure','communication')),
  severity       VARCHAR(10)   NOT NULL CHECK (severity IN ('info','warning','critical')),
  sensor_key     VARCHAR(50),
  actual_value   DOUBLE PRECISION,
  threshold      DOUBLE PRECISION,
  message        TEXT,
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_ea_equipment ON equipment_alerts (equipment_id, created_at DESC);
CREATE INDEX idx_ea_severity  ON equipment_alerts (severity, resolved_at);
