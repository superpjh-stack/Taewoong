-- Seed: 원료 입고 데이터 추가 20건 (RM-2026-0011 ~ RM-2026-0030)
-- LOT 번호, Heat No, 소재 종류, 중량, 화학성분, 검사상태 포함

INSERT INTO raw_materials (
  material_lot_no, supplier_id, material_type, heat_no_supplier,
  weight_kg, chemical_composition, received_at, inspection_status,
  rejection_reason, ai_judgement
)
SELECT
  v.lot_no,
  s.id,
  v.mat,
  v.h_no,
  v.wt,
  v.chem::jsonb,
  v.recv::timestamptz,
  v.status,
  v.rej_reason,
  v.ai::jsonb
FROM (VALUES
  -- POSCO - SM45C 합격
  ('RM-2026-0011', 'SUP-001', 'SM45C', 'POSCO-HN-24016', 3250.00,
   '{"C":"0.43","Si":"0.28","Mn":"0.72","P":"0.018","S":"0.012"}',
   '2026-05-01 09:00:00+09', 'passed', NULL,
   '{"judgement":"pass","confidence":0.97,"reason":"전성분 기준치 이내"}'),

  -- 현대제철 - SCM440 합격
  ('RM-2026-0012', 'SUP-002', 'SCM440', 'HST-HN-5534', 4800.00,
   '{"C":"0.39","Si":"0.25","Mn":"0.80","Cr":"1.02","Mo":"0.18","P":"0.016","S":"0.010"}',
   '2026-05-02 10:30:00+09', 'passed', NULL,
   '{"judgement":"pass","confidence":0.96,"reason":"Cr/Mo 함량 정상 범위"}'),

  -- 일본제철 - SNCM8 검사대기
  ('RM-2026-0013', 'SUP-003', 'SNCM8', 'NSC-HN-7825', 2100.50,
   '{"C":"0.38","Si":"0.24","Mn":"0.70","Ni":"1.85","Cr":"0.72","Mo":"0.16"}',
   '2026-05-03 08:15:00+09', 'pending', NULL,
   NULL),

  -- SSAB - SS400 합격
  ('RM-2026-0014', 'SUP-004', 'SS400', 'SSAB-HN-33812', 5500.00,
   '{"C":"0.17","Si":"0.15","Mn":"0.55","P":"0.020","S":"0.015"}',
   '2026-05-04 11:00:00+09', 'passed', NULL,
   '{"judgement":"pass","confidence":0.98,"reason":"구조용 강 기준 충족"}'),

  -- 보산강철 - STS304 반려
  ('RM-2026-0015', 'SUP-005', 'STS304', 'BSG-HN-92041', 1800.00,
   '{"C":"0.08","Si":"0.60","Mn":"1.90","Ni":"8.20","Cr":"17.50","P":"0.045","S":"0.030"}',
   '2026-05-05 14:20:00+09', 'rejected', 'P 함량 초과 (기준: 0.040 이하, 실측: 0.045)',
   '{"judgement":"fail","confidence":0.91,"reason":"P 0.045 > 기준 0.040"}'),

  -- ArcelorMittal - SCM440 합격
  ('RM-2026-0016', 'SUP-006', 'SCM440', 'ARC-HN-10293', 6200.00,
   '{"C":"0.40","Si":"0.26","Mn":"0.82","Cr":"1.05","Mo":"0.19","P":"0.014","S":"0.009"}',
   '2026-05-06 09:45:00+09', 'passed', NULL,
   '{"judgement":"pass","confidence":0.99,"reason":"전성분 우수"}'),

  -- Tata Steel - SM45C 합격
  ('RM-2026-0017', 'SUP-007', 'SM45C', 'TATA-HN-67832', 2950.75,
   '{"C":"0.44","Si":"0.27","Mn":"0.74","P":"0.019","S":"0.013"}',
   '2026-05-07 13:00:00+09', 'passed', NULL,
   '{"judgement":"pass","confidence":0.95,"reason":"탄소강 기준 만족"}'),

  -- JSW Steel - SKD11 검사대기
  ('RM-2026-0018', 'SUP-008', 'SKD11', 'JSW-HN-44521', 890.00,
   '{"C":"1.52","Si":"0.28","Mn":"0.35","Cr":"11.80","Mo":"0.82","V":"0.21"}',
   '2026-05-08 10:00:00+09', 'pending', NULL,
   NULL),

  -- 동국제강 - SNCM8 합격
  ('RM-2026-0019', 'SUP-009', 'SNCM8', 'DKS-HN-21045', 3100.00,
   '{"C":"0.37","Si":"0.23","Mn":"0.68","Ni":"1.82","Cr":"0.70","Mo":"0.15"}',
   '2026-05-09 08:30:00+09', 'passed', NULL,
   '{"judgement":"pass","confidence":0.97,"reason":"Ni-Cr-Mo 계 기준치 이내"}'),

  -- 세아제강 - SS400 합격
  ('RM-2026-0020', 'SUP-010', 'SS400', 'SEA-HN-88234', 7800.00,
   '{"C":"0.16","Si":"0.14","Mn":"0.52","P":"0.018","S":"0.013"}',
   '2026-05-10 15:10:00+09', 'passed', NULL,
   '{"judgement":"pass","confidence":0.98,"reason":"일반 구조용 강 기준 충족"}'),

  -- POSCO - SCM440 반려
  ('RM-2026-0021', 'SUP-001', 'SCM440', 'POSCO-HN-24017', 4200.00,
   '{"C":"0.41","Si":"0.26","Mn":"0.79","Cr":"0.88","Mo":"0.16","P":"0.017","S":"0.022"}',
   '2026-05-12 09:20:00+09', 'rejected', 'S 함량 초과 (기준: 0.020 이하, 실측: 0.022)',
   '{"judgement":"fail","confidence":0.89,"reason":"S 0.022 > 기준 0.020"}'),

  -- 현대제철 - STS304 합격
  ('RM-2026-0022', 'SUP-002', 'STS304', 'HST-HN-5535', 1250.00,
   '{"C":"0.06","Si":"0.55","Mn":"1.75","Ni":"8.50","Cr":"18.20","P":"0.033","S":"0.021"}',
   '2026-05-13 11:45:00+09', 'passed', NULL,
   '{"judgement":"pass","confidence":0.96,"reason":"18-8계 스테인리스강 기준 우수"}'),

  -- 일본제철 - SM45C 검사대기
  ('RM-2026-0023', 'SUP-003', 'SM45C', 'NSC-HN-7826', 3800.00,
   '{"C":"0.45","Si":"0.29","Mn":"0.75","P":"0.020","S":"0.014"}',
   '2026-05-14 08:00:00+09', 'pending', NULL,
   NULL),

  -- SSAB - SKD11 합격
  ('RM-2026-0024', 'SUP-004', 'SKD11', 'SSAB-HN-33813', 680.00,
   '{"C":"1.48","Si":"0.25","Mn":"0.32","Cr":"11.50","Mo":"0.79","V":"0.19"}',
   '2026-05-15 14:00:00+09', 'passed', NULL,
   '{"judgement":"pass","confidence":0.94,"reason":"냉간공구강 기준 충족"}'),

  -- 보산강철 - SNCM8 합격
  ('RM-2026-0025', 'SUP-005', 'SNCM8', 'BSG-HN-92042', 2650.00,
   '{"C":"0.36","Si":"0.22","Mn":"0.67","Ni":"1.79","Cr":"0.68","Mo":"0.14"}',
   '2026-05-16 10:15:00+09', 'passed', NULL,
   '{"judgement":"pass","confidence":0.95,"reason":"합금강 규격 만족"}'),

  -- ArcelorMittal - SS400 검사대기
  ('RM-2026-0026', 'SUP-006', 'SS400', 'ARC-HN-10294', 8900.00,
   '{"C":"0.18","Si":"0.16","Mn":"0.58","P":"0.021","S":"0.016"}',
   '2026-05-17 09:00:00+09', 'pending', NULL,
   NULL),

  -- Tata Steel - SCM440 합격
  ('RM-2026-0027', 'SUP-007', 'SCM440', 'TATA-HN-67833', 5100.00,
   '{"C":"0.40","Si":"0.25","Mn":"0.81","Cr":"1.03","Mo":"0.18","P":"0.015","S":"0.010"}',
   '2026-05-19 13:30:00+09', 'passed', NULL,
   '{"judgement":"pass","confidence":0.97,"reason":"크롬몰리강 기준 충족"}'),

  -- JSW Steel - SM45C 검사대기
  ('RM-2026-0028', 'SUP-008', 'SM45C', 'JSW-HN-44522', 4400.00,
   '{"C":"0.43","Si":"0.27","Mn":"0.71","P":"0.019","S":"0.012"}',
   '2026-05-20 08:45:00+09', 'pending', NULL,
   NULL),

  -- 동국제강 - STS304 합격
  ('RM-2026-0029', 'SUP-009', 'STS304', 'DKS-HN-21046', 960.00,
   '{"C":"0.07","Si":"0.52","Mn":"1.80","Ni":"8.30","Cr":"17.80","P":"0.035","S":"0.022"}',
   '2026-05-21 11:00:00+09', 'passed', NULL,
   '{"judgement":"pass","confidence":0.96,"reason":"오스테나이트계 기준 충족"}'),

  -- 세아제강 - SCM440 검사대기
  ('RM-2026-0030', 'SUP-010', 'SCM440', 'SEA-HN-88235', 3650.00,
   '{"C":"0.39","Si":"0.24","Mn":"0.78","Cr":"1.01","Mo":"0.17","P":"0.016","S":"0.011"}',
   '2026-05-22 15:30:00+09', 'pending', NULL,
   NULL)
) AS v(lot_no, sup_code, mat, h_no, wt, chem, recv, status, rej_reason, ai)
JOIN suppliers s ON s.supplier_code = v.sup_code
ON CONFLICT (material_lot_no) DO NOTHING;
