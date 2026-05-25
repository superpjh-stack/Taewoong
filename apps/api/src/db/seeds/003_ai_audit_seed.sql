-- 003_ai_audit_seed.sql
-- ai_agent_sessions 및 audit_logs 시드 데이터 (각 10건)

-- ─────────────────────────────────────────
-- ai_agent_sessions
-- ─────────────────────────────────────────
INSERT INTO ai_agent_sessions (user_id, agent_type, question, answer, reasoning, sources, confidence, function_calls, tokens_used, latency_ms, session_id, created_at)
SELECT u.id, at_, q, a, r::jsonb, s::jsonb, c, fc::jsonb, tok, lat, ses::uuid, ts::timestamptz
FROM (VALUES
  ('admin@taewung.co.kr',    'incoming',    '오늘 입고된 RM-2026-0009 원자재 성분 검사 결과는?',
   'RM-2026-0009 (HST-HN-5531 / SM45C)는 현재 pending 상태입니다. C:0.43, Si:0.23, Mn:0.71, P:0.016, S:0.009 — 규격 내 예상되나 AI 판정 대기 중입니다.',
   '{"nodes":["query_raw_material","check_composition","format_response"],"trace":[{"node":"query_raw_material","result":"found"},{"node":"check_composition","result":"within_spec"}]}',
   '{"docs":[{"id":"RM-2026-0009","type":"raw_material","relevance":0.98}]}',
   0.9120, '{"calls":[{"fn":"get_raw_material","args":{"lot_no":"RM-2026-0009"},"result":"ok"}]}',
   842, 1240, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2026-05-14 09:15:00+09'),

  ('process1@taewung.co.kr', 'heating_opt', 'LOT-2026-0005 가열 최적 레시피 추천해줘',
   'LOT-2026-0005 (SM45C, Dia 1000mm)에는 RCP-SM45C-XL 레시피를 권장합니다. 목표온도 1230°C, 균열 150분. 에너지 절감 예상: 약 8% (기존 대비).',
   '{"nodes":["identify_material","select_recipe","optimize_params","estimate_energy"],"trace":[{"node":"select_recipe","result":"RCP-SM45C-XL"},{"node":"optimize_params","rec_temp_c":1230,"rec_soak_min":150}]}',
   '{"docs":[{"id":"RCP-SM45C-XL","type":"heating_recipe","relevance":0.97},{"id":"LOT-2026-0005","type":"lot","relevance":0.95}]}',
   0.9420, '{"calls":[{"fn":"get_lot","args":{"lot_no":"LOT-2026-0005"},"result":"ok"},{"fn":"recommend_recipe","args":{"material":"SM45C","dia_mm":1000},"result":"ok"}]}',
   1124, 1850, 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '2026-05-11 05:45:00+09'),

  ('quality1@taewung.co.kr', 'shipping',    'SHP-2026-0006 출하 보류 사유 및 해제 조건은?',
   'SHP-2026-0006 (LOT-2026-0003, CUST-A)는 최종 인장 성적서 미제출로 보류 중입니다. 해제 조건: SCM440 인장시험 성적서 (tensile ≥ 930MPa, yield ≥ 780MPa) 제출 및 품질 승인 필요.',
   '{"nodes":["query_shipment","check_hold_reason","identify_conditions"],"trace":[{"node":"check_hold_reason","reason":"tensile_cert_missing"}]}',
   '{"docs":[{"id":"SHP-2026-0006","type":"shipment","relevance":0.99},{"id":"CLM-2026-0003","type":"claim","relevance":0.82}]}',
   0.9210, '{"calls":[{"fn":"get_shipment","args":{"shipment_no":"SHP-2026-0006"},"result":"ok"},{"fn":"get_quality_inspections","args":{"lot_no":"LOT-2026-0003"},"result":"ok"}]}',
   978, 1560, 'c3d4e5f6-a7b8-9012-cdef-123456789012', '2026-05-24 10:30:00+09'),

  ('process2@taewung.co.kr', 'heating_opt', '가열로 EQ-F01 오늘 에너지 소비 분석해줘',
   'EQ-F01 오늘(5/14) 에너지 소비: 약 7,240 kWh (LOT-2026-0005). 톤당 에너지: 399 kWh/ton — 목표(420 kWh/ton) 대비 5% 절감. Zone 2 온도편차 ±5°C 이내 안정적.',
   '{"nodes":["query_sensor_data","aggregate_energy","compare_target","generate_insight"],"trace":[{"node":"aggregate_energy","total_kwh":7240},{"node":"compare_target","saving_pct":5.0}]}',
   '{"docs":[{"id":"EQ-F01","type":"equipment","relevance":0.96},{"id":"LOT-2026-0005","type":"heating_process","relevance":0.94}]}',
   0.9380, '{"calls":[{"fn":"get_sensor_data","args":{"equipment_code":"EQ-F01","date":"2026-05-14"},"result":"ok"},{"fn":"get_heating_process","args":{"lot_no":"LOT-2026-0005"},"result":"ok"}]}',
   1356, 2120, 'd4e5f6a7-b8c9-0123-defa-234567890123', '2026-05-14 12:00:00+09'),

  ('admin@taewung.co.kr',    'integrated',  '이번 주 전체 공정 현황 요약해줘',
   '이번 주(5/19~5/24) 요약: 입고 3건(통과), LOT 진행 10건(출하완료 1, 검사 중 2, 열처리 2, 단조 2, 가열 1, 입고대기 2), 클레임 신규 2건. OEE 평균 82.3%, 납기준수율 92%.',
   '{"nodes":["query_lots","query_shipments","query_claims","query_kpi","synthesize"],"trace":[{"node":"query_lots","count":10},{"node":"query_kpi","oee":82.3}]}',
   '{"docs":[{"id":"kpi_2026-05-14","type":"kpi_snapshot","relevance":0.95}]}',
   0.9050, '{"calls":[{"fn":"get_lots_summary","result":"ok"},{"fn":"get_kpi_snapshot","args":{"date":"2026-05-14"},"result":"ok"},{"fn":"get_claims_open","result":"ok"}]}',
   2240, 3450, 'e5f6a7b8-c9d0-1234-efab-345678901234', '2026-05-24 08:00:00+09'),

  ('quality2@taewung.co.kr', 'shipping',    'CUST-A 납품 이력과 클레임 현황은?',
   'CUST-A 납품 이력: 총 3건 (SHP-0001 출하완료, SHP-0006 보류, SHP-0010 보류). 클레임: CLM-0001(표면, resolved), CLM-0003(기계적성질, open-high), CLM-0004(포장손상, closed). 고위험 클레임 1건 주의.',
   '{"nodes":["query_customer_shipments","query_claims","risk_assessment"],"trace":[{"node":"risk_assessment","risk_level":"medium","open_high_claims":1}]}',
   '{"docs":[{"id":"CUST-A","type":"customer","relevance":0.97}]}',
   0.9300, '{"calls":[{"fn":"get_shipments_by_customer","args":{"customer_code":"CUST-A"},"result":"ok"},{"fn":"get_claims_by_customer","args":{"customer_code":"CUST-A"},"result":"ok"}]}',
   1045, 1780, 'f6a7b8c9-d0e1-2345-fabc-456789012345', '2026-05-23 14:20:00+09'),

  ('process3@taewung.co.kr', 'heating_opt', 'SCM440 가열공정 재가열율 왜 높지?',
   'SCM440 재가열율 분석: 현재 0% (이번 달 기준). 단, EQ-F03 유지보수로 단일 설비 과부하 위험 있음. 권장사항: EQ-F03 복구 후 부하 분산, 재가열율 목표 5% 이내 유지.',
   '{"nodes":["query_heating_processes","calculate_reheat_rate","root_cause_analysis","recommend"],"trace":[{"node":"calculate_reheat_rate","rate":0.0},{"node":"root_cause_analysis","issue":"equipment_capacity"}]}',
   '{"docs":[{"id":"RCP-SCM440-L","type":"heating_recipe","relevance":0.88}]}',
   0.8760, '{"calls":[{"fn":"get_heating_processes","args":{"material":"SCM440"},"result":"ok"},{"fn":"get_equipment_status","result":"ok"}]}',
   892, 1420, 'a7b8c9d0-e1f2-3456-abcd-567890123456', '2026-05-22 16:00:00+09'),

  ('quality3@taewung.co.kr', 'incoming',    'SUP-005 (Baoshan) 원자재 불합격 원인 분석해줘',
   'RM-2026-0005 (Baoshan, SM45C) 불합격: P 0.022% (한계 0.020% 초과), S 0.016% (한계 근접). AI 신뢰도 87.9%. 권고: 해당 공급사 SM45C 추가 샘플링 검사 및 Grade B 등급 재검토.',
   '{"nodes":["query_raw_material","check_spec","identify_failures","recommend"],"trace":[{"node":"check_spec","failures":["P_high"],"warnings":["S_near_limit"]}]}',
   '{"docs":[{"id":"RM-2026-0005","type":"raw_material","relevance":0.99},{"id":"SUP-005","type":"supplier","relevance":0.91}]}',
   0.9580, '{"calls":[{"fn":"get_raw_material","args":{"lot_no":"RM-2026-0005"},"result":"ok"},{"fn":"get_supplier_quality","args":{"supplier_code":"SUP-005"},"result":"ok"}]}',
   764, 1100, 'b8c9d0e1-f2a3-4567-bcde-678901234567', '2026-05-24 11:00:00+09'),

  ('process4@taewung.co.kr', 'integrated',  'LOT-2026-0009 SKD11 전체 공정 이력 추적해줘',
   'LOT-2026-0009 (SKD11, CUST-F) 이력: ① 입고(RM-0006, POSCO) → ② 가열(EQ-F02, RCP-SKD11, 1048°C) → ③ 단조(진행중) → ④ 열처리(EQ-HT01, 870°C 어닐링) → ⑤ 검사(UT pass Class B, 경도 HRC60). 현재 단계: inspection 완료, 출하준비.',
   '{"nodes":["get_lot_lineage","trace_processes","summarize"],"trace":[{"node":"get_lot_lineage","depth":4}]}',
   '{"docs":[{"id":"LOT-2026-0009","type":"lot","relevance":1.0}]}',
   0.9810, '{"calls":[{"fn":"get_lot_lineage","args":{"lot_no":"LOT-2026-0009"},"result":"ok"},{"fn":"get_process_results","args":{"lot_no":"LOT-2026-0009"},"result":"ok"}]}',
   1567, 2380, 'c9d0e1f2-a3b4-5678-cdef-789012345678', '2026-05-15 15:00:00+09'),

  ('admin@taewung.co.kr',    'integrated',  '5월 KPI 달성률 분석 및 개선 포인트는?',
   '5월 KPI 분석: OEE 82.3% (목표 85%, -2.7%p), 검사합격률 95.5% (목표 97%, -1.5%p), 납기준수율 92% (목표 95%, -3%p). 개선 포인트: ①EQ-F03 조기 복구로 OEE 향상, ②SCM440 인장시험 인증 속도 개선으로 납기 준수 향상.',
   '{"nodes":["query_kpi_snapshots","calculate_achievement","identify_gaps","prioritize_improvements"],"trace":[{"node":"calculate_achievement","overall_pct":88.2}]}',
   '{"docs":[{"id":"kpi_2026-05-14","type":"kpi_snapshot","relevance":0.98},{"id":"kpi_2026-05-13","type":"kpi_snapshot","relevance":0.92}]}',
   0.9250, '{"calls":[{"fn":"get_kpi_snapshots","args":{"month":"2026-05"},"result":"ok"},{"fn":"get_kpi_targets","result":"ok"}]}',
   1890, 2950, 'd0e1f2a3-b4c5-6789-defa-890123456789', '2026-05-24 17:00:00+09')
) AS v(email, at_, q, a, r, s, c, fc, tok, lat, ses, ts)
JOIN users u ON u.email = v.email
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- audit_logs (감사 로그)
-- ─────────────────────────────────────────
INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address, user_agent, payload, created_at)
SELECT u.id, act, res, res_id, ip::inet, ua, pl::jsonb, ts::timestamptz
FROM (VALUES
  ('admin@taewung.co.kr',    'login',   'auth',              NULL, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0) Chrome/124',
   '{"email":"admin@taewung.co.kr","result":"success"}',
   '2026-05-24 08:00:00+09'),

  ('process1@taewung.co.kr', 'create',  'heating_process',   1,    '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0) Chrome/124',
   '{"lot_no":"LOT-2026-0001","equipment_code":"EQ-F01","recipe_code":"RCP-SM45C-L","action":"start_heating"}',
   '2026-05-03 06:05:00+09'),

  ('quality1@taewung.co.kr', 'create',  'quality_inspection', 1,   '192.168.1.103', 'Mozilla/5.0 (Windows NT 10.0) Chrome/124',
   '{"lot_no":"LOT-2026-0001","inspection_type":"ut","result":"pass","ai_anomaly_score":0.0312}',
   '2026-05-05 09:10:00+09'),

  ('admin@taewung.co.kr',    'approve', 'shipment',          1,    '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0) Chrome/124',
   '{"shipment_no":"SHP-2026-0001","before":{"ship_status":"approved"},"after":{"ship_status":"shipped"},"approved_by":"admin@taewung.co.kr"}',
   '2026-05-06 14:05:00+09'),

  ('quality1@taewung.co.kr', 'approve', 'shipment',          2,    '192.168.1.103', 'Mozilla/5.0 (Windows NT 10.0) Chrome/124',
   '{"shipment_no":"SHP-2026-0002","before":{"ship_status":"ready"},"after":{"ship_status":"approved"},"note":"minor surface mark acknowledged"}',
   '2026-05-13 14:10:00+09'),

  ('process2@taewung.co.kr', 'update',  'lot',               3,    '192.168.1.102', 'Mozilla/5.0 (Windows NT 10.0) Chrome/124',
   '{"lot_no":"LOT-2026-0003","before":{"current_stage":"forging"},"after":{"current_stage":"heat_treatment"},"reason":"forging completed"}',
   '2026-05-05 19:15:00+09'),

  ('admin@taewung.co.kr',    'create',  'heating_recipe',    6,    '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0) Chrome/124',
   '{"recipe_code":"RCP-SKD11","material_type":"SKD11","version":1,"created_by":"admin@taewung.co.kr"}',
   '2026-05-01 10:00:00+09'),

  ('quality3@taewung.co.kr', 'create',  'claim',             3,    '192.168.1.105', 'Mozilla/5.0 (Windows NT 10.0) Chrome/124',
   '{"claim_no":"CLM-2026-0003","lot_no":"LOT-2026-0003","severity":"high","claim_type":"mechanical","customer":"CUST-A"}',
   '2026-05-24 09:00:00+09'),

  ('process1@taewung.co.kr', 'login',   'auth',              NULL, '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0) Chrome/124',
   '{"email":"process1@taewung.co.kr","result":"success"}',
   '2026-05-24 07:55:00+09'),

  ('admin@taewung.co.kr',    'update',  'user',              5,    '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0) Chrome/124',
   '{"target_email":"viewer1@taewung.co.kr","before":{"is_active":true},"after":{"is_active":true},"note":"password reset requested"}',
   '2026-05-20 11:00:00+09')
) AS v(email, act, res, res_id, ip, ua, pl, ts)
JOIN users u ON u.email = v.email
ON CONFLICT DO NOTHING;
