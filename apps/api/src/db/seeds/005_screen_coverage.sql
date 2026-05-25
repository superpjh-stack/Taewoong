-- 005_screen_coverage.sql
-- 화면 빈 데이터 제거를 위한 추가 시드
-- 대상: heating_processes status 수정, heating_process_events, heating_temperature_logs,
--        kpi_targets, kpi_target_history, ai_agent_decisions, ai_agent_alerts,
--        ai_datasets, data_sources, notification_rules, code_master 추가

-- ─────────────────────────────────────────
-- 1. heating_processes status 업데이트
--    ended_at이 있으면 completed, 없으면 in_progress
-- ─────────────────────────────────────────
UPDATE heating_processes
SET status = 'completed', completed_at = ended_at
WHERE ended_at IS NOT NULL AND status = 'in_progress';

-- ─────────────────────────────────────────
-- 2. heating_process_events (가열 이벤트) — 각 heating_process당 4건
-- ─────────────────────────────────────────
INSERT INTO heating_process_events (heating_process_id, event_type, event_label, occurred_at)
SELECT hp.id, ev.event_type, ev.event_label, (hp.started_at + ev.offset_interval)
FROM heating_processes hp
CROSS JOIN (VALUES
  ('charged',       '장입 완료',       INTERVAL '0 minutes'),
  ('target_reached','목표온도 도달',   INTERVAL '90 minutes'),
  ('soaking_done',  '균열 완료',       INTERVAL '150 minutes'),
  ('discharged',    '추출 완료',       INTERVAL '180 minutes')
) AS ev(event_type, event_label, offset_interval)
WHERE hp.ended_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 3. heating_temperature_logs (온도 로그)
--    각 heating_process * zone_no 1~3, 30분 간격으로 기록
-- ─────────────────────────────────────────
INSERT INTO heating_temperature_logs (heating_process_id, equipment_id, zone_no, current_temp, target_temp, recorded_at)
SELECT
  hp.id,
  hp.equipment_id,
  z.zone_no,
  -- 존별, 시간별 현실적 온도 시뮬레이션
  CASE z.zone_no
    WHEN 1 THEN ROUND((800 + (t.elapsed * 6.5))::numeric, 1)   -- 예열 존
    WHEN 2 THEN ROUND((900 + (t.elapsed * 5.5))::numeric, 1)   -- 가열 존
    WHEN 3 THEN ROUND((850 + (t.elapsed * 4.8))::numeric, 1)   -- 균열 존
  END AS current_temp,
  CASE z.zone_no
    WHEN 1 THEN COALESCE(hp.actual_preheat_temp_c, 850.0)
    WHEN 2 THEN COALESCE(hp.actual_max_temp_c, 1220.0)
    WHEN 3 THEN COALESCE(hp.actual_max_temp_c - 20, 1200.0)
  END AS target_temp,
  (hp.started_at + (t.elapsed * INTERVAL '30 minutes')) AS recorded_at
FROM heating_processes hp
CROSS JOIN (VALUES (1),(2),(3)) AS z(zone_no)
CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) AS t(elapsed)
WHERE hp.ended_at IS NOT NULL
  AND (hp.started_at + (t.elapsed * INTERVAL '30 minutes')) <= hp.ended_at
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 4. kpi_targets (KPI 목표) — kpi_type, unit 포함
-- ─────────────────────────────────────────
INSERT INTO kpi_targets (metric_key, target_value, effective_from, effective_to, set_by, kpi_type, unit)
SELECT mk, tv, ef::date, et::date, u.id, kt, un
FROM (VALUES
  ('oee',                  85.0, '2026-01-01', NULL,         'admin@taewung.com', 'production', '%'),
  ('throughput',            9.0, '2026-01-01', NULL,         'admin@taewung.com', 'production', 'LOT'),
  ('inspection_pass_rate', 97.0, '2026-01-01', NULL,         'admin@taewung.com', 'quality',    '%'),
  ('defect_rate',           3.0, '2026-01-01', NULL,         'admin@taewung.com', 'quality',    '%'),
  ('reheat_rate',           5.0, '2026-01-01', NULL,         'admin@taewung.com', 'production', '%'),
  ('on_time_delivery',     95.0, '2026-01-01', NULL,         'admin@taewung.com', 'production', '%'),
  ('furnace_utilization',  80.0, '2026-01-01', NULL,         'admin@taewung.com', 'production', '%'),
  ('energy_per_ton_kwh',  420.0, '2026-01-01', NULL,         'admin@taewung.com', 'production', 'kWh/ton'),
  ('claim_rate',            2.0, '2026-01-01', NULL,         'admin@taewung.com', 'quality',    '%'),
  ('cpk',                   1.33,'2026-01-01', NULL,         'admin@taewung.com', 'quality',    '')
) AS v(mk, tv, ef, et, email, kt, un)
JOIN users u ON u.email = v.email
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 5. kpi_target_history (변경 이력)
-- ─────────────────────────────────────────
INSERT INTO kpi_target_history (kpi_target_id, old_value, new_value, changed_by)
SELECT t.id, t.target_value - 5, t.target_value, u.id
FROM kpi_targets t
JOIN users u ON u.email = 'admin@taewung.com'
WHERE t.metric_key IN ('oee', 'inspection_pass_rate', 'on_time_delivery')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 6. kpi_daily_snapshots 추가 (더 많은 날짜 데이터)
-- ─────────────────────────────────────────
INSERT INTO kpi_daily_snapshots (snapshot_date, kpi_type, metric_key, value, target_value, unit, dimension)
VALUES
  ('2026-05-11','productivity',  'oee',                  81.8, 85.0, '%',   '{"equipment_id":1}'),
  ('2026-05-11','quality',       'inspection_pass_rate', 96.2, 97.0, '%',   '{}'),
  ('2026-05-11','quality',       'defect_rate',           3.8,  3.0, '%',   '{}'),
  ('2026-05-11','delivery',      'on_time_delivery',     91.5, 95.0, '%',   '{}'),
  ('2026-05-10','productivity',  'oee',                  83.5, 85.0, '%',   '{"equipment_id":1}'),
  ('2026-05-10','quality',       'inspection_pass_rate', 98.1, 97.0, '%',   '{}'),
  ('2026-05-10','productivity',  'throughput',            8.5,  9.0, 'LOT', '{}'),
  ('2026-05-09','productivity',  'oee',                  79.4, 85.0, '%',   '{"equipment_id":1}'),
  ('2026-05-09','quality',       'reheat_rate',           4.5,  5.0, '%',   '{}'),
  ('2026-05-08','productivity',  'oee',                  85.2, 85.0, '%',   '{"equipment_id":1}'),
  ('2026-05-08','quality',       'defect_rate',           2.8,  3.0, '%',   '{}'),
  ('2026-05-07','productivity',  'oee',                  82.0, 85.0, '%',   '{"equipment_id":1}'),
  ('2026-05-15','productivity',  'oee',                  84.3, 85.0, '%',   '{"equipment_id":1}'),
  ('2026-05-15','quality',       'inspection_pass_rate', 97.5, 97.0, '%',   '{}'),
  ('2026-05-15','delivery',      'on_time_delivery',     93.0, 95.0, '%',   '{}'),
  ('2026-05-16','productivity',  'oee',                  83.7, 85.0, '%',   '{"equipment_id":1}'),
  ('2026-05-16','quality',       'defect_rate',           3.1,  3.0, '%',   '{}'),
  ('2026-05-17','productivity',  'throughput',            9.2,  9.0, 'LOT', '{}'),
  ('2026-05-18','productivity',  'oee',                  86.1, 85.0, '%',   '{"equipment_id":1}'),
  ('2026-05-18','quality',       'inspection_pass_rate', 98.3, 97.0, '%',   '{}')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 7. ai_agent_decisions (AI 의사결정 추천)
-- ─────────────────────────────────────────
INSERT INTO ai_agent_decisions (id, priority, category, title, rationale, recommended_action, confidence_score, status, created_at)
VALUES
  (gen_random_uuid(), 'HIGH',   '가열공정 최적화', 'EQ-F01 Zone2 온도 과열 — 레시피 조정 필요',
   'EQ-F01 Zone2 온도가 목표 대비 평균 +18°C 편차 발생. 최근 5일 데이터 분석 결과 에너지 낭비 및 조직 과열 위험 있음.',
   '가열 레시피 RCP-SM45C-L 의 Zone2 설정온도를 1220°C → 1205°C로 조정. 균열시간 10분 연장으로 보상.',
   0.9210, 'pending', '2026-05-24 08:30:00+09'),
  (gen_random_uuid(), 'HIGH',   '품질 관리',       'LOT-2026-0003 인장시험 성적서 미제출 — 출하 보류 해제 필요',
   'SHP-2026-0006 출하가 인장시험 성적서 미제출로 12일째 보류 중. CUST-A 납기 초과 위험.',
   '품질팀에 SCM440 인장시험 (tensile ≥ 930MPa) 긴급 진행 요청. 완료 후 AI 출하 판정 재실행.',
   0.9650, 'pending', '2026-05-24 09:00:00+09'),
  (gen_random_uuid(), 'MEDIUM', '설비 유지보수',   'EQ-F03 복구 지연 — 설비 과부하 위험',
   'EQ-F03 유지보수로 EQ-F01, EQ-F02에 부하 집중. 현재 가동률 EQ-F01: 94%, EQ-F02: 87%. 과부하 시 설비 수명 단축 우려.',
   'EQ-F03 유지보수 완료 일정 조기화 검토. 현재 일정(6/15) → 6/5로 앞당길 것을 권장.',
   0.8540, 'pending', '2026-05-23 14:00:00+09'),
  (gen_random_uuid(), 'MEDIUM', '공급망 관리',     'SUP-005 (Baoshan) SM45C 재납품 조건 강화 권고',
   'RM-2026-0005 P 성분 초과 불합격 이력 존재. SUP-005 Grade B 등급으로 관리 중이나 최근 2건 불합격 발생.',
   '차기 발주 시 화학성분 성적서 (Mill Certificate) 사전 제출 의무화 및 합격 후 납품 조건 추가.',
   0.8120, 'pending', '2026-05-22 10:00:00+09'),
  (gen_random_uuid(), 'LOW',    '에너지 절감',     '야간 설비 대기 전력 최적화 기회',
   '주말 야간 EQ-F01, EQ-F02 대기 전력 소비 분석 결과, 불필요한 예열 유지로 인해 월 약 2,400kWh 낭비 추정.',
   '주말 야간 설비 자동 절전 모드 스케줄 설정. 대기 온도를 200°C 유지로 재시작 시간 20분 추가 비용 대비 절약 효과 검토.',
   0.7830, 'accepted', '2026-05-21 16:00:00+09'),
  (gen_random_uuid(), 'HIGH',   '출하 승인',       'SHP-2026-0005 표면검사 보류 — 즉시 조치 필요',
   'SHP-2026-0005 (LOT-2026-0006, CUST-B) AI 출하 판정 confidence 85.1%로 review 상태. 표면검사 미완료.',
   '육안검사 및 MT 검사 완료 후 AI 재판정 실행. 합격 시 출하 승인 진행.',
   0.8510, 'pending', '2026-05-24 11:00:00+09'),
  (gen_random_uuid(), 'MEDIUM', '품질 관리',       'SCM440 경도 편차 증가 추세 — 열처리 조건 재검토',
   '최근 3주간 SCM440 열처리 후 경도 측정값 편차(σ)가 8 HBW → 14 HBW로 증가. 공정 능력 저하 신호.',
   '열처리 레시피 WS-HT-002 재검토. 담금질 온도 ±5°C 허용폭을 ±3°C로 강화, 경도 측정 빈도 2배 확대.',
   0.8920, 'pending', '2026-05-23 09:00:00+09'),
  (gen_random_uuid(), 'LOW',    '재고 관리',       'SM45C 원자재 재고 부족 예측 — 선행 발주 필요',
   '현재 SM45C 재고 41,050 kg. 진행 LOT 기준 소요량 38,800 kg. 예상 재고 부족일: 2026-06-10.',
   'SUP-001 (POSCO) 또는 SUP-002 (현대제철)에 SM45C 20,000 kg 선행 발주. 리드타임 7일 고려.',
   0.9030, 'deferred', '2026-05-20 13:00:00+09'),
  (gen_random_uuid(), 'MEDIUM', '납기 관리',       'CUST-D LOT-2026-0005 납기 리스크 — 가열 지연',
   'LOT-2026-0005 가열공정 시작 예정일 대비 2일 지연. 납기일 2026-06-05 준수 위해 단조/열처리 병행 스케줄 필요.',
   '가열 완료 즉시 EQ-P01 긴급 배정. 단조 후 열처리 우선 배치 요청. 납기 준수 가능성 78%.',
   0.7810, 'pending', '2026-05-22 08:00:00+09'),
  (gen_random_uuid(), 'LOW',    '데이터 품질',     'RM-2026-0009, 0013, 0023 검사 대기 장기화',
   '3건의 원자재가 7일 이상 pending 상태. AI 자동 판정 미완료로 가열공정 스케줄 차질 우려.',
   '해당 원자재 AI 판정 수동 검토 및 화학성분 재확인 후 조기 판정 처리.',
   0.8240, 'pending', '2026-05-24 15:00:00+09')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 8. ai_agent_alerts (AI 이상감지 알림)
-- ─────────────────────────────────────────
INSERT INTO ai_agent_alerts (id, severity, title, message, improvement_suggestion, related_params, is_read, created_at)
VALUES
  (gen_random_uuid(), 'CRITICAL', 'EQ-F01 Zone2 온도 이상 감지',
   'EQ-F01 Zone2 온도가 1268°C를 기록. 레시피 상한(1250°C) 대비 +18°C 초과.',
   '즉시 Zone2 버너 출력 감소. 목표온도 재설정 후 30분 모니터링 유지.',
   '{"equipment_code":"EQ-F01","zone":"zone2","actual_temp":1268,"target_temp":1250,"deviation":18}',
   false, '2026-05-24 06:15:00+09'),
  (gen_random_uuid(), 'WARNING',  'EQ-P01 진동 비정상 증가',
   'EQ-P01 프레스 베드 진동이 7.21 mm/s로 경보 임계값(4.5 mm/s) 초과.',
   '즉각 점검 후 베어링 상태 확인. 필요시 가동 중단.',
   '{"equipment_code":"EQ-P01","sensor":"vibration","actual":7.21,"threshold":4.5}',
   false, '2026-05-24 13:45:00+09'),
  (gen_random_uuid(), 'WARNING',  'LOT-2026-0002 치수 불량 의심',
   'LOT-2026-0002 치수검사에서 직경 600.4mm 측정. 허용 공차 ±0.5mm 접근.',
   '추가 측정 포인트 확인 및 최종 기계가공 여유분 확인.',
   '{"lot_no":"LOT-2026-0002","measured_dia":600.4,"nominal":600,"tolerance":0.5}',
   true, '2026-05-12 11:00:00+09'),
  (gen_random_uuid(), 'CRITICAL', 'SUP-005 원자재 P 성분 초과',
   'RM-2026-0005 인 성분 0.022% 검출. 규격 상한(0.020%) 초과로 불합격 처리.',
   '해당 LOT 격리 조치. 공급사에 재발 방지 대책 요구.',
   '{"lot_no":"RM-2026-0005","element":"P","actual":0.022,"limit":0.020}',
   true, '2026-05-05 09:30:00+09'),
  (gen_random_uuid(), 'INFO',     'EQ-HT02 담금질 온도 미달',
   'EQ-HT02 담금질 존 온도 845°C. 목표(855°C) 대비 -10°C.',
   '10°C 편차는 SCM440 경도에 영향 가능. 다음 배치에서 설정 온도 +5°C 보정.',
   '{"equipment_code":"EQ-HT02","actual_temp":845,"target_temp":855,"deviation":-10}',
   false, '2026-05-15 09:20:00+09'),
  (gen_random_uuid(), 'WARNING',  'KPI OEE 목표 미달 추세 지속',
   '5월 1~24일 평균 OEE 82.1%. 목표(85%) 대비 2.9%p 미달. 3주 연속 하락세.',
   'EQ-F03 복구 가속화 및 교대 근무 효율 점검 필요.',
   '{"metric":"oee","period":"2026-05-01~2026-05-24","avg_value":82.1,"target":85.0,"gap":-2.9}',
   false, '2026-05-24 08:00:00+09'),
  (gen_random_uuid(), 'WARNING',  'SHP-2026-0006 납기 초과 위험',
   'SHP-2026-0006 보류 12일 경과. CUST-A 납기일(2026-05-25) 초과 임박.',
   '인장시험 성적서 긴급 처리 및 출하 승인 절차 간소화 검토.',
   '{"shipment_no":"SHP-2026-0006","hold_days":12,"due_date":"2026-05-25","customer":"CUST-A"}',
   false, '2026-05-24 10:00:00+09'),
  (gen_random_uuid(), 'INFO',     '야간 에너지 사용량 최적화 가능',
   '지난 주말 EQ-F01 야간 대기 전력 소비 분석 완료. 월 약 2,400kWh 절약 가능.',
   '자동 절전 스케줄 설정 권장.',
   '{"potential_saving_kwh":2400,"period":"weekend_night","equipment":"EQ-F01,EQ-F02"}',
   true, '2026-05-20 09:00:00+09'),
  (gen_random_uuid(), 'CRITICAL', 'EQ-F03 PLC 통신 오류',
   'EQ-F03 PLC와 통신 단절. 설비 상태 모니터링 불가.',
   '즉각 현장 확인 및 PLC 재기동. 점검 완료 전 해당 설비 가동 금지.',
   '{"equipment_code":"EQ-F03","error":"PLC_COMM_LOST","last_contact":"2026-05-08T01:00:00Z"}',
   true, '2026-05-08 01:00:00+09'),
  (gen_random_uuid(), 'INFO',     'SCM440 경도 편차 증가 추세',
   '최근 3주 SCM440 열처리 경도 편차(σ) 8→14 HBW로 증가. Cpk 1.42→1.21로 하락.',
   '열처리 레시피 재검토 및 담금질 온도 허용폭 강화 필요.',
   '{"material":"SCM440","hardness_std_before":8,"hardness_std_after":14,"cpk_before":1.42,"cpk_after":1.21}',
   false, '2026-05-23 14:30:00+09')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 9. data_sources (데이터 소스)
-- ─────────────────────────────────────────
INSERT INTO data_sources (name, process_stage, table_or_channel, collect_interval_sec, status, last_collected_at, description, is_active)
VALUES
  ('가열로 #1 온도 센서',         'heating',      'equipment_sensor_data',       30,  'normal',  '2026-05-25 06:00:00+09', 'EQ-F01 Zone 1~4 온도, 전류 실시간 수집', true),
  ('가열로 #2 온도 센서',         'heating',      'equipment_sensor_data',       30,  'normal',  '2026-05-25 06:00:00+09', 'EQ-F02 Zone 1~3 온도 수집', true),
  ('가열로 #3 온도 센서',         'heating',      'equipment_sensor_data',       30,  'error',   '2026-05-08 01:00:00+09', 'EQ-F03 PLC 통신 오류로 수집 중단', false),
  ('프레스 #1 진동/압력 센서',    'forging',      'equipment_sensor_data',       60,  'normal',  '2026-05-25 05:58:00+09', 'EQ-P01 베드 진동, 유압 압력 수집', true),
  ('프레스 #2 진동/압력 센서',    'forging',      'equipment_sensor_data',       60,  'normal',  '2026-05-25 05:58:00+09', 'EQ-P02 베드 진동, 유압 압력 수집', true),
  ('열처리로 #1 온도/분위기 센서','heat_treatment','equipment_sensor_data',       60,  'normal',  '2026-05-25 06:00:00+09', 'EQ-HT01 어닐링로 온도 및 분위기 가스 수집', true),
  ('담금질/템퍼링 라인 센서',     'heat_treatment','equipment_sensor_data',       60,  'delayed', '2026-05-25 05:45:00+09', 'EQ-HT02 담금질 온도, 냉각수 온도 수집', true),
  ('UT 검사 데이터',              'inspection',   'quality_inspections',         300, 'normal',  '2026-05-24 17:30:00+09', 'UT 검사 결과 자동 수집', true),
  ('원자재 입고 데이터',          'incoming',     'raw_materials',               600, 'normal',  '2026-05-24 16:00:00+09', 'ERP 연동 입고 데이터 수집', true),
  ('출하 데이터',                 'shipped',      'shipments',                   300, 'normal',  '2026-05-24 17:00:00+09', 'ERP 연동 출하 실적 수집', true)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 10. ai_datasets (AI 학습 데이터셋)
-- ─────────────────────────────────────────
INSERT INTO ai_datasets (name, version, target_model, sample_count, missing_rate, outlier_rate, date_range_start, date_range_end, description, created_by, status)
VALUES
  ('가열공정 최적화 학습셋 v1',   'v1.0', '가열온도 예측모델 (Heating Opt)',     12450, 0.0230, 0.0120, '2025-01-01', '2025-12-31',
   'SM45C, SCM440 가열공정 실적 데이터. 입력: 강종, 규격, 장입중량. 출력: 최적온도, 균열시간, 에너지.',
   'admin@taewung.com', 'active'),
  ('가열공정 최적화 학습셋 v2',   'v2.0', '가열온도 예측모델 (Heating Opt)',     18720, 0.0180, 0.0090, '2025-01-01', '2026-04-30',
   '2026년 데이터 추가. SNCM8, SKD11, SUS304 강종 추가 포함. 모델 정확도 향상.',
   'admin@taewung.com', 'active'),
  ('원자재 입고 판정 학습셋 v1',  'v1.0', '성분 합부 판정모델 (Incoming)',        8930, 0.0310, 0.0150, '2024-06-01', '2025-12-31',
   '화학성분(C, Si, Mn, P, S, Cr, Mo, Ni) → 합부 판정. 불합격 사례 포함.',
   'admin@taewung.com', 'active'),
  ('출하 AI 판정 학습셋 v1',      'v1.0', '출하 승인 판정모델 (Shipping)',        6280, 0.0420, 0.0200, '2024-06-01', '2025-12-31',
   '품질검사 결과, 클레임 이력, 공정 실적 → 출하 승인/보류 판정.',
   'admin@taewung.com', 'active'),
  ('이상감지 학습셋 v1',           'v1.0', '설비 이상탐지모델 (Anomaly Det)',      24560, 0.0150, 0.0340, '2024-01-01', '2025-12-31',
   '가열로, 프레스 센서 시계열 데이터. 정상 패턴 대비 이상 감지 이진 분류.',
   'admin@taewung.com', 'active'),
  ('가열공정 최적화 학습셋 v3',   'v3.0', '가열온도 예측모델 (Heating Opt)',     21300, 0.0120, 0.0080, '2025-01-01', '2026-05-01',
   'v2 기반 최신 업데이트. 재가열 이벤트 특징 추가. 에너지 절감 목표 반영.',
   'admin@taewung.com', 'in-review'),
  ('품질 이상감지 학습셋 v1',      'v1.0', '품질 이상탐지모델 (Quality Anomaly)',  5640, 0.0280, 0.0180, '2024-06-01', '2025-12-31',
   'UT, MT, 경도, 인장 검사 결과 → 이상 점수(0~1) 회귀 예측.',
   'admin@taewung.com', 'active'),
  ('통합 에이전트 RAG 데이터셋',  'v1.0', '통합 AI 에이전트 (Integrated)',        3200, 0.0050, 0.0010, '2025-01-01', '2026-05-01',
   '사내 SOP, 작업기준서, 클레임 보고서 텍스트 데이터. RAG 검색 인덱스용.',
   'admin@taewung.com', 'active'),
  ('원자재 입고 판정 학습셋 v2',  'v2.0', '성분 합부 판정모델 (Incoming)',        11450, 0.0220, 0.0130, '2024-06-01', '2026-04-30',
   '강종별 세분화 및 공급사별 편차 특징 추가. 신뢰도 향상.',
   'admin@taewung.com', 'active'),
  ('출하 AI 판정 학습셋 v2',      'v2.0', '출하 승인 판정모델 (Shipping)',         9120, 0.0310, 0.0170, '2024-06-01', '2026-04-30',
   '클레임 이력 가중치 강화. 고위험 고객사 패턴 반영.',
   'admin@taewung.com', 'deprecated')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 11. notification_rules (알림 규칙)
-- ─────────────────────────────────────────
INSERT INTO notification_rules (name, metric_key, operator, threshold, channels, target_role_codes, is_active)
VALUES
  ('OEE 목표 미달 경보',             'oee',                  '<',  80.0, '["email","app"]', '["admin","process"]',         true),
  ('검사 합격률 경보',               'inspection_pass_rate', '<',  95.0, '["email","app"]', '["admin","quality"]',          true),
  ('재가열율 경보',                  'reheat_rate',          '>',   8.0, '["app"]',         '["admin","process"]',         true),
  ('납기준수율 위험',                'on_time_delivery',     '<',  90.0, '["email","app"]', '["admin","quality"]',          true),
  ('불량률 경보',                    'defect_rate',          '>',   5.0, '["email","app"]', '["admin","quality"]',          true),
  ('가열로 온도 상한 초과',          'furnace_temp_high',    '>',  1280.0,'["app"]',        '["admin","process"]',         true),
  ('설비 가동률 저하',               'furnace_utilization',  '<',  70.0, '["email","app"]', '["admin","process"]',         true),
  ('에너지 사용량 과다',             'energy_per_ton_kwh',   '>',  500.0,'["email"]',       '["admin"]',                   true),
  ('KPI 목표 초과달성 알림',         'oee',                  '>',  90.0, '["app"]',         '["admin","process","quality"]',true),
  ('클레임 발생률 경보',             'claim_rate',           '>',   3.0, '["email","app"]', '["admin","quality"]',          true)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 12. code_master 추가 항목
-- ─────────────────────────────────────────
INSERT INTO code_master (category, code, name, name_en, sort_order) VALUES
  -- 강종 추가
  ('material_type','SNCM8',   'Ni-Cr-Mo 합금강 SNCM8',     'Ni-Cr-Mo Steel SNCM8', 6),
  ('material_type','SKD11',   '냉간공구강 SKD11',           'Cold Tool Steel SKD11',7),
  ('material_type','SUS304',  '오스테나이트계 STS304',      'SUS304 Stainless',     8),
  ('material_type','SS400',   '일반구조용 압연강재 SS400',  'Rolled Steel SS400',   9),
  -- 공정 타입
  ('process_type','heating',  '가열공정',    'Heating',      1),
  ('process_type','forging',  '단조공정',    'Forging',      2),
  ('process_type','heat_treatment','열처리', 'Heat Treatment',3),
  ('process_type','machining','기계가공',    'Machining',    4),
  ('process_type','inspection','검사',       'Inspection',   5),
  ('process_type','shipping', '출하',        'Shipping',     6),
  -- KPI 타입
  ('kpi_type','oee',                 '설비종합효율',       'OEE',                    1),
  ('kpi_type','defect_rate',         '불량률',             'Defect Rate',            2),
  ('kpi_type','inspection_pass_rate','검사 합격률',        'Inspection Pass Rate',   3),
  ('kpi_type','reheat_rate',         '재가열율',           'Reheat Rate',            4),
  ('kpi_type','on_time_delivery',    '납기준수율',         'On-Time Delivery',       5),
  ('kpi_type','energy_per_ton_kwh',  '톤당 에너지',        'Energy per Ton (kWh)',   6),
  -- 고객사 코드
  ('customer_code','CUST-A',  '현대중공업',      'Hyundai Heavy Industries', 1),
  ('customer_code','CUST-B',  '두산에너빌리티',  'Doosan Enerbility',        2),
  ('customer_code','CUST-C',  '한화에어로스페이스','Hanwha Aerospace',        3),
  ('customer_code','CUST-D',  'HD현대마린솔루션','HD Hyundai Marine',        4),
  ('customer_code','CUST-E',  '현대건설기계',    'Hyundai Construction Eq',  5),
  ('customer_code','CUST-F',  'LS일렉트릭',      'LS Electric',              6),
  ('customer_code','CUST-G',  '효성중공업',      'Hyosung Heavy Industries', 7),
  -- 공급사 코드
  ('supplier_grade','A','우수 공급사 (A등급)','Supplier Grade A', 1),
  ('supplier_grade','B','일반 공급사 (B등급)','Supplier Grade B', 2),
  ('supplier_grade','C','관찰 공급사 (C등급)','Supplier Grade C', 3)
ON CONFLICT (category, code) DO NOTHING;

-- ─────────────────────────────────────────
-- 13. lots 추가 데이터 (더 많은 단계 분산)
-- ─────────────────────────────────────────
INSERT INTO lots (lot_no, heat_id, product_code, product_name, quantity, weight_kg, spec, current_stage, status, customer_code, due_date)
SELECT lot_no, h.id, pc, pn, qty, wt, spec::jsonb, stage, sts, cust, due::date
FROM (VALUES
  ('LOT-2026-0011','HN-2026-0009','PRD-SCM440-700','SCM440 대형 샤프트 Dia700', 1, 4800.00,'{"diameter_mm":700,"length_mm":1500}', 'inspection',  'active',  'CUST-A', '2026-06-20'),
  ('LOT-2026-0012','HN-2026-0010','PRD-SM45C-500', 'SM45C 일반 봉강 Dia500',    3, 3600.00,'{"diameter_mm":500,"length_mm":800}',  'forging',     'active',  'CUST-B', '2026-06-25'),
  ('LOT-2026-0013','HN-2026-0005','PRD-SCM440-250','SCM440 소형 볼트 원형재',  10, 1200.00,'{"diameter_mm":250,"length_mm":400}',  'heat_treatment','active','CUST-C', '2026-06-18'),
  ('LOT-2026-0014','HN-2026-0006','PRD-SM45C-850', 'SM45C 원판 Dia850',         1, 5200.00,'{"diameter_mm":850,"length_mm":160}',  'heating',     'active',  'CUST-D', '2026-07-05'),
  ('LOT-2026-0015','HN-2026-0003','PRD-SM45C-600B','SM45C 봉재 Dia600 배치2',   2, 4400.00,'{"diameter_mm":600,"length_mm":1000}', 'shipped',     'shipped', 'CUST-E', '2026-05-20')
) AS v(lot_no, hn, pc, pn, qty, wt, spec, stage, sts, cust, due)
JOIN heats h ON h.heat_no = v.hn
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 14. 추가 lots에 대한 heating_processes
-- ─────────────────────────────────────────
INSERT INTO heating_processes (lot_id, equipment_id, recipe_id, started_at, ended_at, actual_max_temp_c, actual_preheat_temp_c, actual_soak_time_min, energy_kwh, reheat_count, ai_optimization, status, completed_at)
SELECT l.id, e.id, r.id, start_t::timestamptz, end_t::timestamptz, mx, pre, soak_t, ekwh, rh, ai::jsonb, st, comp_t::timestamptz
FROM (VALUES
  ('LOT-2026-0011','EQ-F01','RCP-SCM440-L','2026-05-16 06:00:00+09','2026-05-16 11:30:00+09',1246.0,902.0,152,5180.0,0,'{"confidence":0.948,"rec_temp_c":1250,"rec_soak_min":150}','completed','2026-05-16 11:30:00+09'),
  ('LOT-2026-0012','EQ-F01','RCP-SM45C-L', '2026-05-17 06:00:00+09','2026-05-17 10:30:00+09',1219.0,851.0,122,4960.0,0,'{"confidence":0.941,"rec_temp_c":1220,"rec_soak_min":120}','completed','2026-05-17 10:30:00+09'),
  ('LOT-2026-0013','EQ-F02','RCP-SCM440-S','2026-05-18 08:00:00+09','2026-05-18 11:30:00+09',1231.0,899.0,103,3020.0,0,'{"confidence":0.936,"rec_temp_c":1230,"rec_soak_min":100}','completed','2026-05-18 11:30:00+09'),
  ('LOT-2026-0014','EQ-F02','RCP-SM45C-XL','2026-05-25 06:00:00+09', NULL,                   NULL,   NULL,  NULL, NULL, 0,'{"confidence":0.939,"rec_temp_c":1230,"rec_soak_min":150}','in_progress', NULL),
  ('LOT-2026-0015','EQ-F01','RCP-SM45C-L', '2026-05-19 06:00:00+09','2026-05-19 10:30:00+09',1221.0,852.0,124,5010.0,0,'{"confidence":0.952,"rec_temp_c":1220,"rec_soak_min":120}','completed','2026-05-19 10:30:00+09')
) AS v(ln, eq, rc, start_t, end_t, mx, pre, soak_t, ekwh, rh, ai, st, comp_t)
JOIN lots l ON l.lot_no = v.ln
JOIN equipment e ON e.equipment_code = v.eq
JOIN heating_recipes r ON r.recipe_code = v.rc
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 15. 추가 lots에 대한 heating_process_events
-- ─────────────────────────────────────────
INSERT INTO heating_process_events (heating_process_id, event_type, event_label, occurred_at)
SELECT hp.id, ev.event_type, ev.event_label, (hp.started_at + ev.offset_interval)
FROM heating_processes hp
CROSS JOIN (VALUES
  ('charged',       '장입 완료',       INTERVAL '0 minutes'),
  ('target_reached','목표온도 도달',   INTERVAL '90 minutes'),
  ('soaking_done',  '균열 완료',       INTERVAL '150 minutes'),
  ('discharged',    '추출 완료',       INTERVAL '180 minutes')
) AS ev(event_type, event_label, offset_interval)
WHERE hp.ended_at IS NOT NULL
  AND hp.lot_id IN (SELECT id FROM lots WHERE lot_no IN ('LOT-2026-0011','LOT-2026-0012','LOT-2026-0013','LOT-2026-0015'))
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 16. 추가 process_results
-- ─────────────────────────────────────────
INSERT INTO process_results (lot_id, process_type, equipment_id, work_order_no, sequence_no, parameters, result_status, started_at, ended_at, operator_id)
SELECT l.id, pt, e.id, wo, seq, params::jsonb, rs, start_t::timestamptz, end_t::timestamptz, u.id
FROM (VALUES
  ('LOT-2026-0011','forging',       'EQ-P01','WO-2026-0011',1,'{"reduction_ratio":3.3,"final_temp_c":970}',            'ok', '2026-05-16 14:00:00+09','2026-05-16 19:00:00+09','process1@taewung.co.kr'),
  ('LOT-2026-0012','forging',       'EQ-P02','WO-2026-0012',1,'{"reduction_ratio":2.9,"final_temp_c":965}',            'ok', '2026-05-17 14:00:00+09','2026-05-17 18:30:00+09','process2@taewung.co.kr'),
  ('LOT-2026-0013','forging',       'EQ-P02','WO-2026-0013',1,'{"reduction_ratio":2.6,"final_temp_c":975}',            'ok', '2026-05-18 14:00:00+09','2026-05-18 17:00:00+09','process3@taewung.co.kr'),
  ('LOT-2026-0013','heat_treatment','EQ-HT02','WO-2026-0013',2,'{"quench_temp_c":860,"temper_temp_c":580,"hold_min":120}','ok','2026-05-19 08:00:00+09','2026-05-19 14:00:00+09','process3@taewung.co.kr'),
  ('LOT-2026-0015','forging',       'EQ-P01','WO-2026-0015',1,'{"reduction_ratio":2.8,"final_temp_c":960}',            'ok', '2026-05-19 14:00:00+09','2026-05-19 18:00:00+09','process1@taewung.co.kr'),
  ('LOT-2026-0015','heat_treatment','EQ-HT01','WO-2026-0015',2,'{"anneal_temp_c":870,"hold_min":180,"cool_rate":"furnace"}','ok','2026-05-20 08:00:00+09','2026-05-20 17:00:00+09','process4@taewung.co.kr')
) AS v(ln, pt, eq, wo, seq, params, rs, start_t, end_t, email)
JOIN lots l ON l.lot_no = v.ln
JOIN equipment e ON e.equipment_code = v.eq
JOIN users u ON u.email = v.email
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 17. 추가 quality_inspections
-- ─────────────────────────────────────────
INSERT INTO quality_inspections (lot_id, inspection_type, spec_id, measured_values, result, defect_codes, ai_anomaly_score, inspector_id, inspected_at)
SELECT l.id, it, qs.id, mv::jsonb, res, dc, aas, u.id, ins_t::timestamptz
FROM (VALUES
  ('LOT-2026-0011','ut',       'QS-SCM440-UT-GEN','{"max_indication_mm":0.4,"eval_class":"C"}',           'pass',        ARRAY[]::text[], 0.0221, 'quality1@taewung.co.kr','2026-05-20 09:00:00+09'),
  ('LOT-2026-0011','hardness', 'QS-SCM440-HRD',   '{"avg_hbw":315,"min_hbw":308,"max_hbw":322}',          'pass',        ARRAY[]::text[], 0.0198, 'quality2@taewung.co.kr','2026-05-20 10:00:00+09'),
  ('LOT-2026-0011','tensile',  'QS-SCM440-TEN',   '{"tensile_mpa":972,"yield_mpa":832,"elongation_pct":15.8}','pass',  ARRAY[]::text[], 0.0312, 'quality3@taewung.co.kr','2026-05-20 11:00:00+09'),
  ('LOT-2026-0013','ut',       'QS-SCM440-UT-GEN','{"max_indication_mm":0.6,"eval_class":"C"}',           'pass',        ARRAY[]::text[], 0.0341, 'quality1@taewung.co.kr','2026-05-22 09:00:00+09'),
  ('LOT-2026-0013','hardness', 'QS-SCM440-HRD',   '{"avg_hbw":308,"min_hbw":302,"max_hbw":315}',          'pass',        ARRAY[]::text[], 0.0254, 'quality2@taewung.co.kr','2026-05-22 10:00:00+09'),
  ('LOT-2026-0015','ut',       'QS-SM45C-UT-GEN', '{"max_indication_mm":0.7,"eval_class":"D"}',           'pass',        ARRAY[]::text[], 0.0289, 'quality1@taewung.co.kr','2026-05-21 09:00:00+09'),
  ('LOT-2026-0015','dimension','QS-SM45C-DIM',    '{"diameter_mm":600.3,"length_mm":1001.5}',              'pass',        ARRAY[]::text[], 0.0134, 'quality2@taewung.co.kr','2026-05-21 10:00:00+09'),
  ('LOT-2026-0004','dimension','QS-SM45C-DIM',    '{"diameter_mm":401.2,"length_mm":302.8}',              'conditional',  ARRAY['DC-DIM']::text[], 0.3210, 'quality3@taewung.co.kr','2026-05-10 09:00:00+09'),
  ('LOT-2026-0005','visual',   'QS-SM45C-VT',     '{"surface_grade":"S3","defect_count":0}',               'pass',        ARRAY[]::text[], 0.0156, 'quality1@taewung.co.kr','2026-05-13 14:00:00+09'),
  ('LOT-2026-0006','ut',       'QS-SNCM8-UT',     '{"max_indication_mm":1.8,"eval_class":"B"}',           'conditional',  ARRAY['DC-INT']::text[], 0.4120, 'quality2@taewung.co.kr','2026-05-10 10:00:00+09')
) AS v(ln, it, sc, mv, res, dc, aas, email, ins_t)
JOIN lots l ON l.lot_no = v.ln
LEFT JOIN quality_specs qs ON qs.spec_code = v.sc
JOIN users u ON u.email = v.email
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 18. 추가 shipments
-- ─────────────────────────────────────────
INSERT INTO shipments (shipment_no, lot_id, customer_code, customer_order_no, quantity, weight_kg, due_date, ship_status, ai_judgement, ai_confidence)
SELECT sn, l.id, cc, co, qty, wt, due::date, ss, aj::jsonb, ac
FROM (VALUES
  ('SHP-2026-0011','LOT-2026-0011','CUST-A','PO-A-20260516',1,4800.00,'2026-06-20','ready',
   '{"decision":"approve","confidence":0.961,"risks":[]}', 0.9610),
  ('SHP-2026-0012','LOT-2026-0013','CUST-C','PO-C-20260518',10,1200.00,'2026-06-18','ready',
   '{"decision":"approve","confidence":0.947,"risks":[]}', 0.9470),
  ('SHP-2026-0013','LOT-2026-0015','CUST-E','PO-E-20260519',2,4400.00,'2026-05-20','shipped',
   '{"decision":"approve","confidence":0.958,"risks":[]}', 0.9580)
) AS v(sn, ln, cc, co, qty, wt, due, ss, aj, ac)
JOIN lots l ON l.lot_no = v.ln
ON CONFLICT DO NOTHING;

-- shipped 상태 lots의 shipment 업데이트
UPDATE shipments SET shipped_at = '2026-05-21 09:00:00+09'
WHERE shipment_no = 'SHP-2026-0013' AND shipped_at IS NULL;

-- ─────────────────────────────────────────
-- 19. equipment_sensor_data 추가 (최신 데이터)
-- ─────────────────────────────────────────
INSERT INTO equipment_sensor_data (ts, equipment_id, sensor_key, value, quality_flag)
SELECT t::timestamptz, e.id, sk, val, 0
FROM (VALUES
  ('EQ-F01','zone1_temp', '2026-05-25 00:00:00+09', 855.2),
  ('EQ-F01','zone1_temp', '2026-05-25 01:00:00+09', 1105.8),
  ('EQ-F01','zone2_temp', '2026-05-25 01:00:00+09', 1198.4),
  ('EQ-F01','zone2_temp', '2026-05-25 02:00:00+09', 1215.6),
  ('EQ-F01','zone3_temp', '2026-05-25 02:00:00+09', 1182.3),
  ('EQ-F01','current',    '2026-05-25 02:00:00+09', 412.8),
  ('EQ-F02','zone1_temp', '2026-05-25 06:00:00+09', 248.5),
  ('EQ-F02','zone1_temp', '2026-05-25 06:30:00+09', 320.0),
  ('EQ-P01','vibration',  '2026-05-25 00:00:00+09', 2.18),
  ('EQ-P01','pressure',   '2026-05-25 00:00:00+09', 4830.0),
  ('EQ-P02','vibration',  '2026-05-25 00:00:00+09', 1.92),
  ('EQ-P02','pressure',   '2026-05-25 00:00:00+09', 3020.0),
  ('EQ-HT01','zone1_temp','2026-05-25 00:00:00+09', 22.5),
  ('EQ-HT02','zone1_temp','2026-05-25 00:00:00+09', 24.0),
  ('EQ-F01','zone1_temp', '2026-05-24 22:00:00+09', 852.0),
  ('EQ-F01','zone2_temp', '2026-05-24 22:00:00+09', 1192.0),
  ('EQ-P01','vibration',  '2026-05-24 20:00:00+09', 2.35),
  ('EQ-HT01','zone1_temp','2026-05-24 10:00:00+09', 870.0),
  ('EQ-HT01','zone1_temp','2026-05-24 14:00:00+09', 871.5),
  ('EQ-HT02','zone1_temp','2026-05-24 10:00:00+09', 857.0)
) AS v(eq, sk, t, val)
JOIN equipment e ON e.equipment_code = v.eq
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 20. work_standards 추가 (한국어 제목)
-- ─────────────────────────────────────────
INSERT INTO work_standards (standard_code, process_type, title, content, version, is_active) VALUES
  ('WS-INC-003', 'incoming',      '원자재 AI 판정 절차 및 수동 검토 기준',    'AI 판정 결과 신뢰도 0.80 미만 시 수동 검토 진행. 화학성분 재측정 및 현장 확인 필요.', 1, true),
  ('WS-HTG-003', 'heating',       '재가열 공정 작업 기준',                     '재가열 시 예열 온도 50°C 낮추고 균열시간 30% 단축. 재가열 2회 초과 시 LOT 격리.',    1, true),
  ('WS-FRG-002', 'forging',       '대형재 단조 공정 기준 (Dia 700 이상)',       'Dia 700mm 이상 대형재 단조 시 EQ-P01 (5000T) 전용 사용. 환원비 최소 3.0 이상 유지.', 1, true),
  ('WS-HT-003',  'heat_treatment','SKD11 냉간공구강 열처리 기준',               '진공 열처리 필수. 1050°C 오스테나이징 후 질소 가스 냉각. HRC 58~62 목표.',           1, true),
  ('WS-INS-003', 'inspection',    'MT (자분탐상) 검사 절차',                   'KS D 0213 기준. 연속법 적용. 검사 감도: A형 표준시험편 합격 후 검사 시작.',           1, true),
  ('WS-SHP-002', 'shipping',      '출하 성적서 발행 기준',                     '출하 전 품질성적서(UT, 경도, 인장) 일체 구비. AI 출하 판정 confidence 0.90 이상 확인.', 1, true)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 21. quality_specs 추가
-- ─────────────────────────────────────────
INSERT INTO quality_specs (spec_code, material_type, customer_code, standard, inspection_type, criteria) VALUES
  ('QS-SM45C-MT',   'SM45C',  NULL,     'KS',  'mt',        '{"sensitivity":"A","eval_class":"1"}'),
  ('QS-SNCM8-TEN',  'SNCM8',  NULL,     'KS',  'tensile',   '{"min_tensile_mpa":780,"min_yield_mpa":590,"min_elongation_pct":14}'),
  ('QS-SUS304-UT',  'SUS304', NULL,     'ASTM','ut',         '{"acceptance_class":"D","min_freq_mhz":2.0}'),
  ('QS-SM45C-MT2',  'SM45C',  'CUST-A', 'KS',  'mt',        '{"sensitivity":"A","eval_class":"1","linear_limit_mm":1.5}'),
  ('QS-SCM440-MT',  'SCM440', NULL,     'KS',  'mt',        '{"sensitivity":"A","eval_class":"1","linear_limit_mm":1.0}'),
  ('QS-SKD11-TEN',  'SKD11',  NULL,     'JIS', 'tensile',   '{"min_tensile_mpa":1900,"hardness_min_hrc":58}'),
  ('QS-SNCM8-DIM',  'SNCM8',  'CUST-B','KS',  'dimension', '{"diameter_tol_mm":1.5,"length_tol_mm":3.0}'),
  ('QS-SUS304-VT2', 'SUS304', 'CUST-G','ASTM','visual',     '{"surface_grade":"S1","no_pits":true}')
ON CONFLICT DO NOTHING;
