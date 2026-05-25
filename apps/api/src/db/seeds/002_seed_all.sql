-- 002_seed_all.sql  — 전체 테이블 시드 데이터 (테이블당 ~10건)

-- ─────────────────────────────────────────
-- users  (admin은 001에서 이미 생성됨)
-- ─────────────────────────────────────────
INSERT INTO users (email, password_hash, name, department, employee_no, is_active) VALUES
  ('process1@taewung.co.kr', '$2a$12$61Gq2YkVcHgH29djBawfsOajgAZZYr8GrMsFNd36T63WrHz5RHOHK', 'Kim Process', 'Production', 'EMP-001', true),
  ('process2@taewung.co.kr', '$2a$12$61Gq2YkVcHgH29djBawfsOajgAZZYr8GrMsFNd36T63WrHz5RHOHK', 'Lee Process', 'Production', 'EMP-002', true),
  ('quality1@taewung.co.kr', '$2a$12$61Gq2YkVcHgH29djBawfsOajgAZZYr8GrMsFNd36T63WrHz5RHOHK', 'Park Quality', 'Quality', 'EMP-003', true),
  ('quality2@taewung.co.kr', '$2a$12$61Gq2YkVcHgH29djBawfsOajgAZZYr8GrMsFNd36T63WrHz5RHOHK', 'Choi Quality', 'Quality', 'EMP-004', true),
  ('viewer1@taewung.co.kr',  '$2a$12$61Gq2YkVcHgH29djBawfsOajgAZZYr8GrMsFNd36T63WrHz5RHOHK', 'Jung Viewer', 'Planning', 'EMP-005', true),
  ('viewer2@taewung.co.kr',  '$2a$12$61Gq2YkVcHgH29djBawfsOajgAZZYr8GrMsFNd36T63WrHz5RHOHK', 'Yoon Viewer', 'Sales', 'EMP-006', true),
  ('process3@taewung.co.kr', '$2a$12$61Gq2YkVcHgH29djBawfsOajgAZZYr8GrMsFNd36T63WrHz5RHOHK', 'Oh Process', 'Production', 'EMP-007', true),
  ('quality3@taewung.co.kr', '$2a$12$61Gq2YkVcHgH29djBawfsOajgAZZYr8GrMsFNd36T63WrHz5RHOHK', 'Jang Quality', 'Quality', 'EMP-008', true),
  ('process4@taewung.co.kr', '$2a$12$61Gq2YkVcHgH29djBawfsOajgAZZYr8GrMsFNd36T63WrHz5RHOHK', 'Han Process', 'Production', 'EMP-009', true),
  ('viewer3@taewung.co.kr',  '$2a$12$61Gq2YkVcHgH29djBawfsOajgAZZYr8GrMsFNd36T63WrHz5RHOHK', 'Shin Viewer', 'Management', 'EMP-010', true)
ON CONFLICT DO NOTHING;

-- user_roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email IN ('process1@taewung.co.kr','process2@taewung.co.kr','process3@taewung.co.kr','process4@taewung.co.kr')
  AND r.role_code = 'process'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email IN ('quality1@taewung.co.kr','quality2@taewung.co.kr','quality3@taewung.co.kr')
  AND r.role_code = 'quality'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email IN ('viewer1@taewung.co.kr','viewer2@taewung.co.kr','viewer3@taewung.co.kr')
  AND r.role_code = 'viewer'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- suppliers
-- ─────────────────────────────────────────
INSERT INTO suppliers (supplier_code, name, country, quality_grade, avg_defect_rate) VALUES
  ('SUP-001', 'POSCO', 'KR', 'A', 0.0012),
  ('SUP-002', 'Hyundai Steel', 'KR', 'A', 0.0018),
  ('SUP-003', 'Nippon Steel', 'JP', 'A', 0.0008),
  ('SUP-004', 'SSAB', 'SE', 'A', 0.0010),
  ('SUP-005', 'Baoshan Iron & Steel', 'CN', 'B', 0.0035),
  ('SUP-006', 'ArcelorMittal', 'LU', 'B', 0.0028),
  ('SUP-007', 'Tata Steel', 'IN', 'B', 0.0042),
  ('SUP-008', 'JSW Steel', 'IN', 'B', 0.0038),
  ('SUP-009', 'Dongkuk Steel', 'KR', 'A', 0.0022),
  ('SUP-010', 'SeAH Steel', 'KR', 'A', 0.0015)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- equipment
-- ─────────────────────────────────────────
INSERT INTO equipment (equipment_code, name, type, status, location, spec) VALUES
  ('EQ-F01', 'No.1 Walking Beam Furnace', 'furnace', 'running', 'Heating Shop A',
    '{"max_temp_c": 1280, "capacity_t": 50, "zones": 4}'),
  ('EQ-F02', 'No.2 Rotary Hearth Furnace', 'furnace', 'idle', 'Heating Shop A',
    '{"max_temp_c": 1250, "capacity_t": 30, "zones": 3}'),
  ('EQ-F03', 'No.3 Car-Bottom Furnace', 'furnace', 'maintenance', 'Heating Shop B',
    '{"max_temp_c": 1300, "capacity_t": 80, "zones": 5}'),
  ('EQ-P01', 'No.1 Hydraulic Press 5000T', 'press', 'running', 'Forging Shop',
    '{"force_ton": 5000, "stroke_mm": 1200}'),
  ('EQ-P02', 'No.2 Hydraulic Press 3000T', 'press', 'running', 'Forging Shop',
    '{"force_ton": 3000, "stroke_mm": 900}'),
  ('EQ-P03', 'No.3 Hammer Press 2500T', 'press', 'idle', 'Forging Shop',
    '{"force_ton": 2500, "stroke_mm": 800}'),
  ('EQ-HT01', 'No.1 Annealing Furnace', 'heat_treat', 'running', 'Heat Treatment Shop',
    '{"max_temp_c": 950, "atmosphere": "controlled"}'),
  ('EQ-HT02', 'No.2 Quench & Temper Line', 'heat_treat', 'running', 'Heat Treatment Shop',
    '{"max_temp_c": 920, "quench_medium": "water/oil"}'),
  ('EQ-IN01', 'UT Inspection System', 'inspection', 'idle', 'Quality Lab',
    '{"method": "UT", "standard": "ASTM A388"}'),
  ('EQ-IN02', 'Hardness Tester Brinell', 'inspection', 'idle', 'Quality Lab',
    '{"method": "HBW", "range_hbw": "100-600"}')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- quality_specs
-- ─────────────────────────────────────────
INSERT INTO quality_specs (spec_code, material_type, customer_code, standard, inspection_type, criteria) VALUES
  ('QS-SM45C-UT-GEN', 'SM45C', NULL, 'KS', 'ut', '{"acceptance_class": "D", "min_freq_mhz": 2.0}'),
  ('QS-SCM440-UT-GEN', 'SCM440', NULL, 'KS', 'ut', '{"acceptance_class": "C", "min_freq_mhz": 2.0}'),
  ('QS-SM45C-DIM', 'SM45C', NULL, 'KS', 'dimension', '{"diameter_tol_mm": 2.0, "length_tol_mm": 5.0}'),
  ('QS-SCM440-HRD', 'SCM440', NULL, 'KS', 'hardness', '{"min_hbw": 280, "max_hbw": 340}'),
  ('QS-SUS304-VT', 'SUS304', NULL, 'ASTM', 'visual', '{"surface_grade": "S2"}'),
  ('QS-SM45C-TEN', 'SM45C', 'CUST-A', 'KS', 'tensile', '{"min_tensile_mpa": 690, "min_yield_mpa": 490}'),
  ('QS-SCM440-TEN', 'SCM440', 'CUST-B', 'ASTM', 'tensile', '{"min_tensile_mpa": 930, "min_yield_mpa": 780}'),
  ('QS-SNCM8-UT',  'SNCM8',  NULL, 'KS', 'ut', '{"acceptance_class": "B", "min_freq_mhz": 4.0}'),
  ('QS-SKD11-HRD', 'SKD11',  NULL, 'JIS', 'hardness', '{"min_hrc": 58, "max_hrc": 62}'),
  ('QS-SM45C-VT',  'SM45C',  NULL, 'KS', 'visual',   '{"surface_grade": "S3", "no_laps": true}')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- work_standards
-- ─────────────────────────────────────────
INSERT INTO work_standards (standard_code, process_type, title, version, is_active) VALUES
  ('WS-INC-001', 'incoming', 'Raw Material Incoming Inspection Procedure', 1, true),
  ('WS-INC-002', 'incoming', 'Mill Certificate Verification Standard', 1, true),
  ('WS-HTG-001', 'heating', 'Heating Process Work Standard - SM45C', 2, true),
  ('WS-HTG-002', 'heating', 'Heating Process Work Standard - SCM440', 2, true),
  ('WS-FRG-001', 'forging', 'Free Forging Work Standard', 1, true),
  ('WS-HT-001', 'heat_treatment', 'Annealing Process Standard', 1, true),
  ('WS-HT-002', 'heat_treatment', 'Quench & Temper Standard - SCM440', 1, true),
  ('WS-INS-001', 'inspection', 'UT Inspection Procedure', 3, true),
  ('WS-INS-002', 'inspection', 'Dimensional Inspection Standard', 2, true),
  ('WS-SHP-001', 'shipping', 'Shipment Documentation & Approval Procedure', 1, true)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- raw_materials
-- ─────────────────────────────────────────
INSERT INTO raw_materials (material_lot_no, supplier_id, material_type, heat_no_supplier, weight_kg, chemical_composition, received_at, inspection_status, ai_judgement)
SELECT
  lot_no, s.id, mat, h_no, wt, chem::jsonb, recv::timestamptz, status,
  ai::jsonb
FROM (VALUES
  ('RM-2026-0001', 'SUP-001', 'SM45C',   'POSCO-HN-24001', 12500.00,
   '{"C":0.44,"Si":0.24,"Mn":0.72,"P":0.015,"S":0.008}',
   '2026-05-01 08:00:00+09', 'passed',
   '{"result":"pass","confidence":0.972,"reasons":["composition within spec"]}'),
  ('RM-2026-0002', 'SUP-001', 'SCM440',  'POSCO-HN-24002', 8300.00,
   '{"C":0.39,"Si":0.28,"Mn":0.75,"Cr":1.05,"Mo":0.22}',
   '2026-05-02 09:00:00+09', 'passed',
   '{"result":"pass","confidence":0.961,"reasons":["Mo within range"]}'),
  ('RM-2026-0003', 'SUP-002', 'SM45C',   'HST-HN-5523', 15000.00,
   '{"C":0.46,"Si":0.22,"Mn":0.68,"P":0.018,"S":0.011}',
   '2026-05-03 10:00:00+09', 'passed',
   '{"result":"pass","confidence":0.945,"reasons":["all elements in spec"]}'),
  ('RM-2026-0004', 'SUP-003', 'SNCM8',   'NSC-HN-7812', 6200.00,
   '{"C":0.36,"Si":0.26,"Mn":0.72,"Ni":1.82,"Cr":0.75,"Mo":0.17}',
   '2026-05-04 11:00:00+09', 'passed',
   '{"result":"pass","confidence":0.988,"reasons":["premium grade, all ok"]}'),
  ('RM-2026-0005', 'SUP-005', 'SM45C',   'BSS-HN-3301', 9800.00,
   '{"C":0.48,"Si":0.31,"Mn":0.65,"P":0.022,"S":0.016}',
   '2026-05-05 08:30:00+09', 'rejected',
   '{"result":"fail","confidence":0.879,"reasons":["P slightly high","S near upper limit"]}'),
  ('RM-2026-0006', 'SUP-001', 'SKD11',   'POSCO-HN-24010', 3500.00,
   '{"C":1.52,"Si":0.31,"Mn":0.38,"Cr":11.8,"Mo":0.82,"V":0.25}',
   '2026-05-06 09:00:00+09', 'passed',
   '{"result":"pass","confidence":0.993,"reasons":["tool steel, premium"]}'),
  ('RM-2026-0007', 'SUP-009', 'SCM440',  'DKS-HN-8871', 11000.00,
   '{"C":0.41,"Si":0.27,"Mn":0.78,"Cr":1.08,"Mo":0.21}',
   '2026-05-07 10:00:00+09', 'passed',
   '{"result":"pass","confidence":0.967,"reasons":["all within spec"]}'),
  ('RM-2026-0008', 'SUP-004', 'SUS304',  'SSAB-HN-2234', 7600.00,
   '{"C":0.04,"Si":0.52,"Mn":1.38,"Cr":18.2,"Ni":8.1}',
   '2026-05-08 08:00:00+09', 'passed',
   '{"result":"pass","confidence":0.981,"reasons":["stainless composition ok"]}'),
  ('RM-2026-0009', 'SUP-002', 'SM45C',   'HST-HN-5531', 18000.00,
   '{"C":0.43,"Si":0.23,"Mn":0.71,"P":0.016,"S":0.009}',
   '2026-05-09 09:00:00+09', 'pending',
   NULL),
  ('RM-2026-0010', 'SUP-010', 'SCM440',  'SEAH-HN-1123', 5500.00,
   '{"C":0.40,"Si":0.26,"Mn":0.76,"Cr":1.03,"Mo":0.20}',
   '2026-05-10 10:00:00+09', 'passed',
   '{"result":"pass","confidence":0.952,"reasons":["composition verified"]}')
) AS v(lot_no, sup_code, mat, h_no, wt, chem, recv, status, ai)
JOIN suppliers s ON s.supplier_code = v.sup_code
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- heats
-- ─────────────────────────────────────────
INSERT INTO heats (heat_no, material_type, target_composition, actual_composition, total_weight_kg, charged_at, status) VALUES
  ('HN-2026-0001', 'SM45C',
   '{"C":0.45,"Si":0.25,"Mn":0.70}',
   '{"C":0.44,"Si":0.24,"Mn":0.71}',
   12000.00, '2026-05-02 06:00:00+09', 'closed'),
  ('HN-2026-0002', 'SCM440',
   '{"C":0.40,"Si":0.28,"Mn":0.75,"Cr":1.05,"Mo":0.22}',
   '{"C":0.40,"Si":0.27,"Mn":0.76,"Cr":1.06,"Mo":0.21}',
   8000.00,  '2026-05-03 06:00:00+09', 'closed'),
  ('HN-2026-0003', 'SM45C',
   '{"C":0.45,"Si":0.25,"Mn":0.70}',
   '{"C":0.45,"Si":0.23,"Mn":0.69}',
   14500.00, '2026-05-05 06:00:00+09', 'closed'),
  ('HN-2026-0004', 'SNCM8',
   '{"C":0.36,"Si":0.26,"Mn":0.72,"Ni":1.80,"Cr":0.75,"Mo":0.17}',
   '{"C":0.36,"Si":0.26,"Mn":0.72,"Ni":1.82,"Cr":0.75,"Mo":0.17}',
   6000.00,  '2026-05-06 07:00:00+09', 'closed'),
  ('HN-2026-0005', 'SCM440',
   '{"C":0.40,"Si":0.27,"Mn":0.76,"Cr":1.05,"Mo":0.21}',
   '{"C":0.41,"Si":0.27,"Mn":0.77,"Cr":1.04,"Mo":0.21}',
   10500.00, '2026-05-08 06:00:00+09', 'closed'),
  ('HN-2026-0006', 'SM45C',
   '{"C":0.45,"Si":0.25,"Mn":0.70}',
   '{"C":0.44,"Si":0.24,"Mn":0.70}',
   17500.00, '2026-05-10 06:00:00+09', 'closed'),
  ('HN-2026-0007', 'SKD11',
   '{"C":1.52,"Si":0.31,"Mn":0.38,"Cr":11.8,"Mo":0.82,"V":0.25}',
   '{"C":1.52,"Si":0.30,"Mn":0.37,"Cr":11.9,"Mo":0.83,"V":0.25}',
   3200.00,  '2026-05-11 07:00:00+09', 'closed'),
  ('HN-2026-0008', 'SUS304',
   '{"C":0.04,"Si":0.52,"Mn":1.40,"Cr":18.0,"Ni":8.0}',
   '{"C":0.04,"Si":0.52,"Mn":1.38,"Cr":18.2,"Ni":8.1}',
   7200.00,  '2026-05-12 06:00:00+09', 'closed'),
  ('HN-2026-0009', 'SCM440',
   '{"C":0.40,"Si":0.27,"Mn":0.76,"Cr":1.05,"Mo":0.21}',
   '{"C":0.40,"Si":0.28,"Mn":0.75,"Cr":1.05,"Mo":0.22}',
   5300.00,  '2026-05-13 06:00:00+09', 'closed'),
  ('HN-2026-0010', 'SM45C',
   '{"C":0.45,"Si":0.25,"Mn":0.70}',
   NULL,
   18000.00, '2026-05-14 06:00:00+09', 'open')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- heat_materials
-- ─────────────────────────────────────────
INSERT INTO heat_materials (heat_id, raw_material_id, charge_weight_kg, charge_ratio)
SELECT h.id, rm.id, cw, cr
FROM (VALUES
  ('HN-2026-0001', 'RM-2026-0001', 12000.00, 1.0000),
  ('HN-2026-0002', 'RM-2026-0002', 8000.00,  1.0000),
  ('HN-2026-0003', 'RM-2026-0003', 14500.00, 1.0000),
  ('HN-2026-0004', 'RM-2026-0004', 6000.00,  1.0000),
  ('HN-2026-0005', 'RM-2026-0007', 10500.00, 1.0000),
  ('HN-2026-0006', 'RM-2026-0009', 17500.00, 1.0000),
  ('HN-2026-0007', 'RM-2026-0006', 3200.00,  1.0000),
  ('HN-2026-0008', 'RM-2026-0008', 7200.00,  1.0000),
  ('HN-2026-0009', 'RM-2026-0010', 5300.00,  1.0000),
  ('HN-2026-0010', 'RM-2026-0003', 18000.00, 1.0000)
) AS v(hn, rn, cw, cr)
JOIN heats h ON h.heat_no = v.hn
JOIN raw_materials rm ON rm.material_lot_no = v.rn
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- lots  (trigger가 lot_lineage 자동 생성)
-- ─────────────────────────────────────────
INSERT INTO lots (lot_no, heat_id, product_code, product_name, quantity, weight_kg, spec, current_stage, status, customer_code, due_date)
SELECT lot_no, h.id, pc, pn, qty, wt, spec::jsonb, stage, sts, cust, due::date
FROM (VALUES
  ('LOT-2026-0001','HN-2026-0001','PRD-SM45C-800','SM45C Forged Disc Dia800',1, 2800.00,'{"diameter_mm":800,"length_mm":120}', 'shipped',     'shipped', 'CUST-A', '2026-05-15'),
  ('LOT-2026-0002','HN-2026-0001','PRD-SM45C-600','SM45C Forged Bar Dia600', 2, 4200.00,'{"diameter_mm":600,"length_mm":900}', 'inspection',  'active',  'CUST-B', '2026-05-20'),
  ('LOT-2026-0003','HN-2026-0002','PRD-SCM440-500','SCM440 Forged Shaft',    1, 3100.00,'{"diameter_mm":500,"length_mm":1200}','heat_treatment','active', 'CUST-A', '2026-05-25'),
  ('LOT-2026-0004','HN-2026-0002','PRD-SCM440-400','SCM440 Forged Ring',     3, 2400.00,'{"diameter_mm":400,"length_mm":300}', 'forging',     'active',  'CUST-C', '2026-05-28'),
  ('LOT-2026-0005','HN-2026-0003','PRD-SM45C-1000','SM45C Large Disc Dia1000',1,5800.00,'{"diameter_mm":1000,"length_mm":180}','heating',     'active',  'CUST-D', '2026-06-05'),
  ('LOT-2026-0006','HN-2026-0004','PRD-SNCM8-700','SNCM8 Forged Block',     1, 3600.00,'{"diameter_mm":700,"length_mm":500}', 'forging',     'active',  'CUST-B', '2026-06-10'),
  ('LOT-2026-0007','HN-2026-0005','PRD-SCM440-300','SCM440 Small Shaft',     5, 2500.00,'{"diameter_mm":300,"length_mm":600}', 'incoming',    'active',  'CUST-E', '2026-06-15'),
  ('LOT-2026-0008','HN-2026-0006','PRD-SM45C-900','SM45C Disc Dia900',       1, 4100.00,'{"diameter_mm":900,"length_mm":150}', 'incoming',    'hold',    'CUST-A', '2026-06-20'),
  ('LOT-2026-0009','HN-2026-0007','PRD-SKD11-200','SKD11 Tool Steel Block',  2, 1800.00,'{"width_mm":200,"height_mm":200,"length_mm":400}','inspection','active','CUST-F','2026-06-08'),
  ('LOT-2026-0010','HN-2026-0008','PRD-SUS304-600','SUS304 Forged Cylinder', 1, 3900.00,'{"diameter_mm":600,"length_mm":800}', 'heat_treatment','active','CUST-G','2026-06-12')
) AS v(lot_no, hn, pc, pn, qty, wt, spec, stage, sts, cust, due)
JOIN heats h ON h.heat_no = v.hn
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- heating_recipes
-- ─────────────────────────────────────────
INSERT INTO heating_recipes (recipe_code, material_type, product_spec, preheat_temp_c, target_temp_c, soak_temp_c, ramp_rate_c_min, soak_time_min, max_charge_kg, zone_profiles, version, is_active)
SELECT rc, mt, ps, pre, tgt, soak, ramp, soak_t, max_kg, zp::jsonb, ver, active
FROM (VALUES
  ('RCP-SM45C-S', 'SM45C', 'Dia <= 500mm', 850.0, 1200.0, 1180.0, 8.0, 90,  20000.00, '[{"zone":"preheat","temp_c":850},{"zone":"heating","temp_c":1200},{"zone":"soak","temp_c":1180}]', 2, true),
  ('RCP-SM45C-L', 'SM45C', 'Dia > 500mm',  850.0, 1220.0, 1200.0, 6.0, 120, 30000.00, '[{"zone":"preheat","temp_c":850},{"zone":"heating","temp_c":1220},{"zone":"soak","temp_c":1200}]', 2, true),
  ('RCP-SCM440-S','SCM440','Dia <= 500mm', 900.0, 1230.0, 1210.0, 7.0, 100, 15000.00, '[{"zone":"preheat","temp_c":900},{"zone":"heating","temp_c":1230},{"zone":"soak","temp_c":1210}]', 1, true),
  ('RCP-SCM440-L','SCM440','Dia > 500mm',  900.0, 1250.0, 1230.0, 5.0, 150, 25000.00, '[{"zone":"preheat","temp_c":900},{"zone":"heating","temp_c":1250},{"zone":"soak","temp_c":1230}]', 1, true),
  ('RCP-SNCM8',   'SNCM8', 'All',          920.0, 1240.0, 1220.0, 6.0, 120, 20000.00, '[{"zone":"preheat","temp_c":920},{"zone":"heating","temp_c":1240},{"zone":"soak","temp_c":1220}]', 1, true),
  ('RCP-SKD11',   'SKD11', 'All',          850.0, 1050.0, 1030.0, 4.0, 180, 10000.00, '[{"zone":"preheat","temp_c":850},{"zone":"heating","temp_c":1050},{"zone":"soak","temp_c":1030}]', 1, true),
  ('RCP-SUS304',  'SUS304','All',           800.0, 1150.0, 1130.0, 6.0, 100, 20000.00, '[{"zone":"preheat","temp_c":800},{"zone":"heating","temp_c":1150},{"zone":"soak","temp_c":1130}]', 1, true),
  ('RCP-SM45C-R', 'SM45C', 'Reheat',       750.0, 1180.0, 1160.0, 10.0, 60, 20000.00, '[{"zone":"preheat","temp_c":750},{"zone":"heating","temp_c":1180},{"zone":"soak","temp_c":1160}]', 1, true),
  ('RCP-SCM440-R','SCM440','Reheat',        800.0, 1210.0, 1190.0, 9.0,  80, 15000.00, '[{"zone":"preheat","temp_c":800},{"zone":"heating","temp_c":1210},{"zone":"soak","temp_c":1190}]', 1, true),
  ('RCP-SM45C-XL','SM45C', 'Dia > 900mm',  850.0, 1230.0, 1210.0, 5.0, 150, 50000.00, '[{"zone":"preheat","temp_c":850},{"zone":"heating","temp_c":1230},{"zone":"soak","temp_c":1210}]', 1, true)
) AS v(rc, mt, ps, pre, tgt, soak, ramp, soak_t, max_kg, zp, ver, active)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- heating_processes
-- ─────────────────────────────────────────
INSERT INTO heating_processes (lot_id, equipment_id, recipe_id, started_at, ended_at, actual_max_temp_c, actual_preheat_temp_c, actual_soak_time_min, energy_kwh, reheat_count, ai_optimization, operator_id)
SELECT l.id, e.id, r.id, start_t::timestamptz, end_t::timestamptz, mx, pre, soak_t, ekwh, rh, ai::jsonb, u.id
FROM (VALUES
  ('LOT-2026-0001','EQ-F01','RCP-SM45C-L',   '2026-05-03 06:00:00+09','2026-05-03 10:00:00+09', 1218.0, 852.0, 125, 4820.0, 0, '{"confidence":0.947,"rec_temp_c":1220,"rec_soak_min":120}', 'process1@taewung.co.kr'),
  ('LOT-2026-0002','EQ-F01','RCP-SM45C-L',   '2026-05-04 06:00:00+09','2026-05-04 10:30:00+09', 1222.0, 849.0, 128, 5210.0, 0, '{"confidence":0.953,"rec_temp_c":1220,"rec_soak_min":120}', 'process1@taewung.co.kr'),
  ('LOT-2026-0003','EQ-F01','RCP-SCM440-L',  '2026-05-05 06:00:00+09','2026-05-05 11:00:00+09', 1248.0, 903.0, 152, 4630.0, 0, '{"confidence":0.961,"rec_temp_c":1250,"rec_soak_min":150}', 'process2@taewung.co.kr'),
  ('LOT-2026-0004','EQ-F02','RCP-SCM440-S',  '2026-05-06 08:00:00+09','2026-05-06 11:30:00+09', 1232.0, 901.0, 103, 3140.0, 0, '{"confidence":0.938,"rec_temp_c":1230,"rec_soak_min":100}', 'process2@taewung.co.kr'),
  ('LOT-2026-0005','EQ-F01','RCP-SM45C-XL',  '2026-05-11 06:00:00+09','2026-05-11 12:00:00+09', 1228.0, 853.0, 148, 7240.0, 0, '{"confidence":0.942,"rec_temp_c":1230,"rec_soak_min":150}', 'process1@taewung.co.kr'),
  ('LOT-2026-0006','EQ-F01','RCP-SNCM8',     '2026-05-07 07:00:00+09','2026-05-07 11:30:00+09', 1238.0, 921.0, 122, 5380.0, 0, '{"confidence":0.955,"rec_temp_c":1240,"rec_soak_min":120}', 'process3@taewung.co.kr'),
  ('LOT-2026-0007','EQ-F02','RCP-SCM440-S',  '2026-05-09 08:00:00+09','2026-05-09 11:00:00+09', 1229.0, 899.0, 101, 2980.0, 0, '{"confidence":0.944,"rec_temp_c":1230,"rec_soak_min":100}', 'process2@taewung.co.kr'),
  ('LOT-2026-0009','EQ-F02','RCP-SKD11',     '2026-05-12 07:00:00+09','2026-05-12 11:00:00+09', 1048.0, 849.0, 182, 2640.0, 0, '{"confidence":0.971,"rec_temp_c":1050,"rec_soak_min":180}', 'process4@taewung.co.kr'),
  ('LOT-2026-0010','EQ-F01','RCP-SUS304',    '2026-05-13 06:00:00+09','2026-05-13 10:00:00+09', 1148.0, 802.0, 102, 4920.0, 0, '{"confidence":0.958,"rec_temp_c":1150,"rec_soak_min":100}', 'process3@taewung.co.kr'),
  ('LOT-2026-0008','EQ-F02','RCP-SM45C-XL',  '2026-05-14 06:00:00+09', NULL,                    NULL,   NULL,  NULL, NULL,  0, '{"confidence":0.939,"rec_temp_c":1230,"rec_soak_min":150}', 'process1@taewung.co.kr')
) AS v(ln, eq, rc, start_t, end_t, mx, pre, soak_t, ekwh, rh, ai, email)
JOIN lots l ON l.lot_no = v.ln
JOIN equipment e ON e.equipment_code = v.eq
JOIN heating_recipes r ON r.recipe_code = v.rc
JOIN users u ON u.email = v.email
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- process_results
-- ─────────────────────────────────────────
INSERT INTO process_results (lot_id, process_type, equipment_id, work_order_no, sequence_no, parameters, result_status, started_at, ended_at, operator_id)
SELECT l.id, pt, e.id, wo, seq, params::jsonb, rs, start_t::timestamptz, end_t::timestamptz, u.id
FROM (VALUES
  ('LOT-2026-0001','forging',        'EQ-P01','WO-2026-0001',1,'{"reduction_ratio":3.2,"final_temp_c":980}',           'ok', '2026-05-03 13:00:00+09','2026-05-03 17:00:00+09','process1@taewung.co.kr'),
  ('LOT-2026-0002','forging',        'EQ-P01','WO-2026-0002',1,'{"reduction_ratio":2.8,"final_temp_c":960}',           'ok', '2026-05-04 13:00:00+09','2026-05-04 18:00:00+09','process1@taewung.co.kr'),
  ('LOT-2026-0003','forging',        'EQ-P02','WO-2026-0003',1,'{"reduction_ratio":3.5,"final_temp_c":950}',           'ok', '2026-05-05 14:00:00+09','2026-05-05 19:00:00+09','process2@taewung.co.kr'),
  ('LOT-2026-0003','heat_treatment', 'EQ-HT02','WO-2026-0003',2,'{"quench_temp_c":860,"temper_temp_c":580,"hold_min":120}','ok','2026-05-07 08:00:00+09','2026-05-07 14:00:00+09','process3@taewung.co.kr'),
  ('LOT-2026-0004','forging',        'EQ-P02','WO-2026-0004',1,'{"reduction_ratio":2.5,"final_temp_c":970}',           'ok', '2026-05-06 14:00:00+09','2026-05-06 18:00:00+09','process2@taewung.co.kr'),
  ('LOT-2026-0006','forging',        'EQ-P01','WO-2026-0006',1,'{"reduction_ratio":3.0,"final_temp_c":1000}',          'ok', '2026-05-08 13:00:00+09','2026-05-08 18:00:00+09','process3@taewung.co.kr'),
  ('LOT-2026-0009','heat_treatment', 'EQ-HT01','WO-2026-0009',1,'{"anneal_temp_c":870,"hold_min":240,"cool_rate":"furnace"}','ok','2026-05-13 08:00:00+09','2026-05-13 18:00:00+09','process4@taewung.co.kr'),
  ('LOT-2026-0010','forging',        'EQ-P01','WO-2026-0010',1,'{"reduction_ratio":2.8,"final_temp_c":960}',           'ok', '2026-05-14 13:00:00+09','2026-05-14 18:00:00+09','process1@taewung.co.kr'),
  ('LOT-2026-0010','heat_treatment', 'EQ-HT02','WO-2026-0010',2,'{"quench_temp_c":1050,"temper_temp_c":180,"hold_min":60}','ok','2026-05-15 08:00:00+09','2026-05-15 14:00:00+09','process3@taewung.co.kr'),
  ('LOT-2026-0001','heat_treatment', 'EQ-HT02','WO-2026-0001',2,'{"quench_temp_c":850,"temper_temp_c":600,"hold_min":120}','ok','2026-05-04 08:00:00+09','2026-05-04 14:00:00+09','process3@taewung.co.kr')
) AS v(ln, pt, eq, wo, seq, params, rs, start_t, end_t, email)
JOIN lots l ON l.lot_no = v.ln
JOIN equipment e ON e.equipment_code = v.eq
JOIN users u ON u.email = v.email
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- quality_inspections
-- ─────────────────────────────────────────
INSERT INTO quality_inspections (lot_id, inspection_type, spec_id, measured_values, result, defect_codes, ai_anomaly_score, inspector_id, inspected_at)
SELECT l.id, it, qs.id, mv::jsonb, res, dc, aas, u.id, ins_t::timestamptz
FROM (VALUES
  ('LOT-2026-0001','ut',        'QS-SM45C-UT-GEN', '{"max_indication_mm":0.8,"eval_class":"D"}',          'pass', ARRAY[]::text[], 0.0312, 'quality1@taewung.co.kr', '2026-05-05 09:00:00+09'),
  ('LOT-2026-0001','hardness',  NULL,              '{"avg_hbw":285,"min_hbw":280,"max_hbw":291}',         'pass', ARRAY[]::text[], 0.0198, 'quality1@taewung.co.kr', '2026-05-05 10:00:00+09'),
  ('LOT-2026-0001','dimension', 'QS-SM45C-DIM',    '{"diameter_mm":800.8,"length_mm":120.2}',             'pass', ARRAY[]::text[], 0.0145, 'quality2@taewung.co.kr', '2026-05-05 11:00:00+09'),
  ('LOT-2026-0002','ut',        'QS-SM45C-UT-GEN', '{"max_indication_mm":1.2,"eval_class":"D"}',          'pass', ARRAY[]::text[], 0.0521, 'quality1@taewung.co.kr', '2026-05-09 09:00:00+09'),
  ('LOT-2026-0003','ut',        'QS-SCM440-UT-GEN','{"max_indication_mm":0.5,"eval_class":"C"}',          'pass', ARRAY[]::text[], 0.0287, 'quality2@taewung.co.kr', '2026-05-09 10:00:00+09'),
  ('LOT-2026-0003','hardness',  'QS-SCM440-HRD',   '{"avg_hbw":312,"min_hbw":305,"max_hbw":318}',        'pass', ARRAY[]::text[], 0.0234, 'quality2@taewung.co.kr', '2026-05-09 11:00:00+09'),
  ('LOT-2026-0003','tensile',   'QS-SCM440-TEN',   '{"tensile_mpa":965,"yield_mpa":820,"elongation_pct":16.2}','pass',ARRAY[]::text[],0.0312,'quality3@taewung.co.kr','2026-05-10 09:00:00+09'),
  ('LOT-2026-0009','ut',        'QS-SNCM8-UT',     '{"max_indication_mm":0.3,"eval_class":"B"}',          'pass', ARRAY[]::text[], 0.0189, 'quality1@taewung.co.kr', '2026-05-15 09:00:00+09'),
  ('LOT-2026-0009','hardness',  'QS-SKD11-HRD',    '{"avg_hrc":60,"min_hrc":59,"max_hrc":61}',            'pass', ARRAY[]::text[], 0.0221, 'quality2@taewung.co.kr', '2026-05-15 11:00:00+09'),
  ('LOT-2026-0002','dimension', 'QS-SM45C-DIM',    '{"diameter_mm":600.4,"length_mm":901.2}',             'pass', ARRAY[]::text[], 0.0312, 'quality3@taewung.co.kr', '2026-05-12 10:00:00+09')
) AS v(ln, it, sc, mv, res, dc, aas, email, ins_t)
JOIN lots l ON l.lot_no = v.ln
LEFT JOIN quality_specs qs ON qs.spec_code = v.sc
JOIN users u ON u.email = v.email
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- shipments
-- ─────────────────────────────────────────
INSERT INTO shipments (shipment_no, lot_id, customer_code, customer_order_no, quantity, weight_kg, due_date, ship_status, ai_judgement, ai_confidence, approved_by, approved_at, shipped_at)
SELECT sn, l.id, cc, co, qty, wt, due::date, ss, aj::jsonb, ac, u.id, apr_t::timestamptz, ship_t::timestamptz
FROM (VALUES
  ('SHP-2026-0001','LOT-2026-0001','CUST-A','PO-A-20260501',1,2800.00,'2026-05-15','shipped',
   '{"decision":"approve","confidence":0.958,"risks":[]}', 0.9580, 'admin@taewung.co.kr','2026-05-06 14:00:00+09','2026-05-07 09:00:00+09'),
  ('SHP-2026-0002','LOT-2026-0002','CUST-B','PO-B-20260503',2,4200.00,'2026-05-20','approved',
   '{"decision":"approve","confidence":0.941,"risks":["minor surface mark on unit 2"]}', 0.9410, 'quality1@taewung.co.kr','2026-05-13 14:00:00+09', NULL),
  ('SHP-2026-0003','LOT-2026-0004','CUST-C','PO-C-20260502',3,2400.00,'2026-05-28','ready',
   '{"decision":"approve","confidence":0.922,"risks":[]}', 0.9220, NULL, NULL, NULL),
  ('SHP-2026-0004','LOT-2026-0009','CUST-F','PO-F-20260504',2,1800.00,'2026-06-08','ready',
   '{"decision":"approve","confidence":0.963,"risks":[]}', 0.9630, NULL, NULL, NULL),
  ('SHP-2026-0005','LOT-2026-0006','CUST-B','PO-B-20260510',1,3600.00,'2026-06-10','ready',
   '{"decision":"review","confidence":0.851,"risks":["surface inspection pending"]}', 0.8510, NULL, NULL, NULL),
  ('SHP-2026-0006','LOT-2026-0003','CUST-A','PO-A-20260506',1,3100.00,'2026-05-25','held',
   '{"decision":"hold","confidence":0.821,"risks":["await final tensile cert"]}', 0.8210, NULL, NULL, NULL),
  ('SHP-2026-0007','LOT-2026-0010','CUST-G','PO-G-20260501',1,3900.00,'2026-06-12','ready',
   '{"decision":"approve","confidence":0.934,"risks":[]}', 0.9340, NULL, NULL, NULL),
  ('SHP-2026-0008','LOT-2026-0007','CUST-E','PO-E-20260508',5,2500.00,'2026-06-15','ready',
   NULL, NULL, NULL, NULL, NULL),
  ('SHP-2026-0009','LOT-2026-0005','CUST-D','PO-D-20260505',1,5800.00,'2026-06-05','ready',
   NULL, NULL, NULL, NULL, NULL),
  ('SHP-2026-0010','LOT-2026-0008','CUST-A','PO-A-20260512',1,4100.00,'2026-06-20','held',
   '{"decision":"hold","confidence":0.778,"risks":["lot on hold"]}', 0.7780, NULL, NULL, NULL)
) AS v(sn, ln, cc, co, qty, wt, due, ss, aj, ac, email, apr_t, ship_t)
JOIN lots l ON l.lot_no = v.ln
LEFT JOIN users u ON u.email = v.email
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- claims
-- ─────────────────────────────────────────
INSERT INTO claims (claim_no, shipment_id, lot_id, customer_code, claim_type, description, status, severity, occurred_at)
SELECT cn, s.id, l.id, cc, ct, desc_, sts, sev, occ_t::timestamptz
FROM (VALUES
  ('CLM-2026-0001','SHP-2026-0001','LOT-2026-0001','CUST-A','surface','Minor surface scratch on OD after machining','resolved','low','2026-05-18 00:00:00+09'),
  ('CLM-2026-0002','SHP-2026-0002','LOT-2026-0002','CUST-B','dimension','Diameter slightly out of tolerance at one end','investigating','medium','2026-05-22 00:00:00+09'),
  ('CLM-2026-0003',NULL,'LOT-2026-0003','CUST-A','mechanical','Hardness below minimum spec at edge zone','open','high','2026-05-24 00:00:00+09'),
  ('CLM-2026-0004','SHP-2026-0001','LOT-2026-0001','CUST-A','delivery','Packaging damage during transit','closed','low','2026-05-17 00:00:00+09'),
  ('CLM-2026-0005',NULL,'LOT-2026-0006','CUST-B','ndt','UT indication near acceptance limit','open','medium','2026-05-20 00:00:00+09'),
  ('CLM-2026-0006',NULL,'LOT-2026-0004','CUST-C','dimension','Length tolerance exceeded by 3mm on 1 piece','investigating','low','2026-05-25 00:00:00+09'),
  ('CLM-2026-0007','SHP-2026-0004','LOT-2026-0009','CUST-F','surface','Tool mark on side face','open','low','2026-06-01 00:00:00+09'),
  ('CLM-2026-0008',NULL,'LOT-2026-0005','CUST-D','mechanical','Concern about reheat effect on grain structure','open','medium','2026-05-28 00:00:00+09'),
  ('CLM-2026-0009','SHP-2026-0002','LOT-2026-0002','CUST-B','surface','Edge decarburization observed','resolved','low','2026-05-21 00:00:00+09'),
  ('CLM-2026-0010',NULL,'LOT-2026-0010','CUST-G','ndt','MT test shows minor linear indication','investigating','medium','2026-05-30 00:00:00+09')
) AS v(cn, sn, ln, cc, ct, desc_, sts, sev, occ_t)
LEFT JOIN shipments s ON s.shipment_no = v.sn
JOIN lots l ON l.lot_no = v.ln
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- equipment_sensor_data  (설비별 10건씩)
-- ─────────────────────────────────────────
INSERT INTO equipment_sensor_data (ts, equipment_id, sensor_key, value, quality_flag)
SELECT t::timestamptz, e.id, sk, val, 0
FROM (VALUES
  ('EQ-F01','zone1_temp', '2026-05-14 06:00:00+09', 852.4),
  ('EQ-F01','zone1_temp', '2026-05-14 07:00:00+09', 1102.7),
  ('EQ-F01','zone1_temp', '2026-05-14 08:00:00+09', 1198.3),
  ('EQ-F01','zone2_temp', '2026-05-14 08:00:00+09', 1212.8),
  ('EQ-F01','zone2_temp', '2026-05-14 09:00:00+09', 1218.1),
  ('EQ-F01','current',    '2026-05-14 08:00:00+09', 420.5),
  ('EQ-F01','current',    '2026-05-14 09:00:00+09', 398.2),
  ('EQ-P01','vibration',  '2026-05-14 13:00:00+09', 2.31),
  ('EQ-P01','vibration',  '2026-05-14 14:00:00+09', 2.48),
  ('EQ-P01','pressure',   '2026-05-14 13:00:00+09', 4820.0),
  ('EQ-P01','pressure',   '2026-05-14 14:00:00+09', 4950.0),
  ('EQ-F02','zone1_temp', '2026-05-14 08:00:00+09', 865.2),
  ('EQ-F02','zone1_temp', '2026-05-14 09:00:00+09', 1105.8),
  ('EQ-HT01','zone1_temp','2026-05-13 08:00:00+09', 872.1),
  ('EQ-HT01','zone1_temp','2026-05-13 12:00:00+09', 870.5),
  ('EQ-HT02','zone1_temp','2026-05-15 08:00:00+09', 858.3),
  ('EQ-HT02','current',   '2026-05-15 08:00:00+09', 185.4),
  ('EQ-P02','vibration',  '2026-05-06 14:00:00+09', 1.98),
  ('EQ-P02','pressure',   '2026-05-06 14:00:00+09', 3010.0),
  ('EQ-F01','zone3_temp', '2026-05-14 09:00:00+09', 1181.6)
) AS v(eq, sk, t, val)
JOIN equipment e ON e.equipment_code = v.eq
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- equipment_alerts
-- ─────────────────────────────────────────
INSERT INTO equipment_alerts (equipment_id, alert_type, severity, sensor_key, actual_value, threshold, message, resolved_at)
SELECT e.id, at_, sev, sk, av, th, msg, res_t::timestamptz
FROM (VALUES
  ('EQ-F01','temp_high',      'warning',  'zone2_temp', 1268.0, 1250.0, 'Zone 2 temperature exceeded upper limit',    '2026-05-03 11:00:00+09'),
  ('EQ-F01','temp_deviation', 'warning',  'zone1_temp', 835.0,  850.0,  'Zone 1 preheat temperature below target',    '2026-05-04 07:30:00+09'),
  ('EQ-P01','vibration',      'warning',  'vibration',  4.82,   4.5,    'Abnormal vibration detected on press bed',   '2026-05-04 15:00:00+09'),
  ('EQ-F03','communication',  'critical', NULL,         NULL,   NULL,   'PLC communication lost — maintenance check', '2026-05-08 10:00:00+09'),
  ('EQ-HT02','temp_low',      'info',     'zone1_temp', 845.0,  855.0,  'Quench temperature slightly below target',    NULL),
  ('EQ-F01','current',        'info',     'current',    450.0,  440.0,  'Current draw marginally high',               '2026-05-14 10:00:00+09'),
  ('EQ-P02','pressure',       'warning',  'pressure',   3250.0, 3200.0, 'Hydraulic pressure over spec',               '2026-05-06 16:00:00+09'),
  ('EQ-F02','temp_high',      'info',     'zone1_temp', 1258.0, 1250.0, 'Zone 1 slightly above limit — monitor',      NULL),
  ('EQ-HT01','temp_deviation','warning',  'zone1_temp', 895.0,  870.0,  'Annealing temperature overshoot',            '2026-05-13 15:00:00+09'),
  ('EQ-P01','vibration',      'critical', 'vibration',  7.21,   4.5,    'High vibration — machine halted for inspection',NULL)
) AS v(eq, at_, sev, sk, av, th, msg, res_t)
JOIN equipment e ON e.equipment_code = v.eq
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- kpi_daily_snapshots
-- ─────────────────────────────────────────
INSERT INTO kpi_daily_snapshots (snapshot_date, kpi_type, metric_key, value, target_value, unit, dimension) VALUES
  ('2026-05-14','productivity',  'oee',                  82.3,  85.0, '%',   '{"equipment_id":1}'),
  ('2026-05-14','productivity',  'throughput',           8.0,   9.0,  'LOT', '{}'),
  ('2026-05-14','quality',       'inspection_pass_rate', 95.5,  97.0, '%',   '{}'),
  ('2026-05-14','quality',       'defect_rate',          4.5,   3.0,  '%',   '{}'),
  ('2026-05-14','utilization',   'furnace_utilization',  78.2,  80.0, '%',   '{"equipment_id":1}'),
  ('2026-05-14','delivery',      'on_time_delivery',     92.0,  95.0, '%',   '{}'),
  ('2026-05-13','productivity',  'oee',                  84.1,  85.0, '%',   '{"equipment_id":1}'),
  ('2026-05-13','quality',       'reheat_rate',          3.2,   5.0,  '%',   '{}'),
  ('2026-05-13','quality',       'inspection_pass_rate', 97.8,  97.0, '%',   '{}'),
  ('2026-05-12','productivity',  'oee',                  80.6,  85.0, '%',   '{"equipment_id":1}')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- kpi_targets
-- ─────────────────────────────────────────
INSERT INTO kpi_targets (metric_key, target_value, effective_from, effective_to, set_by)
SELECT mk, tv, ef::date, et::date, u.id
FROM (VALUES
  ('oee',                  85.0, '2026-01-01', NULL,         'admin@taewung.co.kr'),
  ('throughput',           9.0,  '2026-01-01', NULL,         'admin@taewung.co.kr'),
  ('inspection_pass_rate', 97.0, '2026-01-01', NULL,         'admin@taewung.co.kr'),
  ('defect_rate',          3.0,  '2026-01-01', NULL,         'admin@taewung.co.kr'),
  ('reheat_rate',          5.0,  '2026-01-01', NULL,         'admin@taewung.co.kr'),
  ('on_time_delivery',     95.0, '2026-01-01', NULL,         'admin@taewung.co.kr'),
  ('furnace_utilization',  80.0, '2026-01-01', NULL,         'admin@taewung.co.kr'),
  ('energy_per_ton_kwh',   420.0,'2026-01-01', NULL,         'admin@taewung.co.kr'),
  ('oee',                  80.0, '2025-01-01', '2025-12-31', 'admin@taewung.co.kr'),
  ('inspection_pass_rate', 96.0, '2025-01-01', '2025-12-31', 'admin@taewung.co.kr')
) AS v(mk, tv, ef, et, email)
JOIN users u ON u.email = v.email
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- notifications
-- ─────────────────────────────────────────
INSERT INTO notifications (target_user_id, notification_type, severity, title, message, related_entity, related_id, is_read)
SELECT u.id, nt, sev, title, msg, re, rel_id, rd
FROM (VALUES
  ('quality1@taewung.co.kr', 'quality_alert',   'warning',  'Inspection Required: LOT-2026-0002', 'UT inspection result needs review',           'lot',      2, false),
  ('process1@taewung.co.kr', 'equipment_alert',  'critical', 'EQ-F01 Temperature Overshoot',       'Zone 2 exceeded 1250°C during heating',       'equipment',1, true),
  ('admin@taewung.co.kr',    'system_alert',     'info',     'Daily KPI Report Ready',              'May 14 KPI snapshot generated',               NULL,       NULL, false),
  ('quality2@taewung.co.kr', 'claim_update',     'warning',  'New Claim: CLM-2026-0003',            'High severity claim opened by CUST-A',        'lot',      3, false),
  ('process2@taewung.co.kr', 'lot_status',       'info',     'LOT-2026-0003 Heat Treatment Done',   'Lot moved to inspection stage',               'lot',      3, true),
  (NULL,                     'system_alert',     'info',     'Maintenance Scheduled: EQ-F03',       'Car-bottom furnace scheduled for maintenance next week', 'equipment',3, false),
  ('quality3@taewung.co.kr', 'shipment_alert',   'warning',  'SHP-2026-0006 On Hold',               'Shipment held pending tensile certificate',   'lot',      6, false),
  ('admin@taewung.co.kr',    'equipment_alert',  'critical', 'EQ-P01 High Vibration Alarm',         'Press vibration 7.21mm/s — immediate action required', 'equipment',4, false),
  ('process4@taewung.co.kr', 'lot_status',       'info',     'LOT-2026-0009 Inspection Passed',     'SKD11 tool steel passed all QC checks',       'lot',      9, true),
  ('viewer1@taewung.co.kr',  'shipment_alert',   'info',     'SHP-2026-0001 Shipped',               'Shipment to CUST-A completed',                'lot',      1, true)
) AS v(email, nt, sev, title, msg, re, rel_id, rd)
LEFT JOIN users u ON u.email = v.email
ON CONFLICT DO NOTHING;
