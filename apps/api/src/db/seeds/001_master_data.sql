-- 001_master_data.sql
-- 초기 마스터 데이터: 역할, 권한, 설비, 코드

-- ─────────────────────────────────────────
-- 역할 (Roles)
-- ─────────────────────────────────────────
INSERT INTO roles (role_code, name, description) VALUES
  ('admin',   '시스템 관리자', '전체 시스템 설정 및 사용자 관리'),
  ('process', '공정 담당자',   '공정 실적 입력, 가열 레시피 조회'),
  ('quality', '품질 담당자',   '검사 결과 입력, 출하 승인'),
  ('viewer',  '조회 전용',     '모든 데이터 조회 (수정 불가)')
ON CONFLICT (role_code) DO NOTHING;

-- ─────────────────────────────────────────
-- 권한 (Permissions)
-- ─────────────────────────────────────────
INSERT INTO permissions (perm_code, resource, action, description) VALUES
  -- incoming
  ('incoming:read',         'incoming',  'read',    '입고 데이터 조회'),
  ('incoming:write',        'incoming',  'write',   '입고 등록/수정'),
  ('incoming:delete',       'incoming',  'delete',  '입고 삭제'),
  -- heating
  ('heating:read',          'heating',   'read',    '가열공정 조회'),
  ('heating:write',         'heating',   'write',   '가열공정 실적 입력'),
  ('heating:recipe:write',  'heating',   'write',   '가열 레시피 등록/수정'),
  ('heating:recipe:approve','heating',   'approve', '가열 레시피 승인'),
  -- process
  ('process:read',          'process',   'read',    '공정 실적 조회'),
  ('process:write',         'process',   'write',   '공정 실적 입력'),
  -- quality
  ('quality:read',          'quality',   'read',    '검사 결과 조회'),
  ('quality:write',         'quality',   'write',   '검사 결과 입력'),
  -- shipment
  ('shipment:read',         'shipment',  'read',    '출하 현황 조회'),
  ('shipment:write',        'shipment',  'write',   '출하 등록/수정'),
  ('shipment:approve',      'shipment',  'approve', '출하 최종 승인'),
  -- dashboard & kpi
  ('dashboard:read',        'dashboard', 'read',    '대시보드 조회'),
  ('kpi:read',              'kpi',       'read',    'KPI 조회'),
  ('kpi:write',             'kpi',       'write',   'KPI 목표 설정'),
  -- data & ai
  ('data:read',             'data',      'read',    '데이터 조회'),
  ('data:export',           'data',      'export',  '데이터 다운로드'),
  ('ai:read',               'ai',        'read',    'AI Agent 조회'),
  ('ai:write',              'ai',        'write',   'AI Agent 질의'),
  -- master & admin
  ('master:read',           'master',    'read',    '기준정보 조회'),
  ('master:write',          'master',    'write',   '기준정보 등록/수정'),
  ('admin:users',           'admin',     'write',   '사용자 관리'),
  ('admin:system',          'admin',     'write',   '시스템 설정')
ON CONFLICT (perm_code) DO NOTHING;

-- ─────────────────────────────────────────
-- 역할-권한 매핑
-- ─────────────────────────────────────────
-- admin: 전체
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.role_code = 'admin'
ON CONFLICT DO NOTHING;

-- process: 공정 관련 + 조회
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_code = 'process'
  AND p.perm_code IN (
    'incoming:read','incoming:write',
    'heating:read','heating:write',
    'process:read','process:write',
    'quality:read',
    'shipment:read',
    'dashboard:read','kpi:read',
    'data:read','data:export',
    'ai:read','ai:write',
    'master:read'
  )
ON CONFLICT DO NOTHING;

-- quality: 품질/출하 관련
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_code = 'quality'
  AND p.perm_code IN (
    'incoming:read',
    'heating:read',
    'process:read',
    'quality:read','quality:write',
    'shipment:read','shipment:write','shipment:approve',
    'dashboard:read','kpi:read',
    'data:read','data:export',
    'ai:read','ai:write',
    'master:read'
  )
ON CONFLICT DO NOTHING;

-- viewer: 조회 전용
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_code = 'viewer'
  AND p.action = 'read'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 설비 초기 데이터
-- ─────────────────────────────────────────
INSERT INTO equipment (equipment_code, name, type, status, location, spec) VALUES
  ('FURNACE-01', '가열로 #1', 'furnace',    'running', 'A동 1층',
   '{"max_temp_c": 1350, "capacity_ton": 30, "zones": ["preheat","heat1","heat2","soak"]}'),
  ('FURNACE-02', '가열로 #2', 'furnace',    'running', 'A동 1층',
   '{"max_temp_c": 1350, "capacity_ton": 25, "zones": ["preheat","heat1","heat2","soak"]}'),
  ('HT-01',      '열처리로 #1','heat_treat', 'idle',    'B동 1층',
   '{"max_temp_c": 950, "capacity_ton": 20}'),
  ('PRESS-01',   '프레스 #1',  'press',      'running', 'A동 2층',
   '{"capacity_ton": 3000, "type": "hydraulic"}'),
  ('PRESS-02',   '프레스 #2',  'press',      'idle',    'A동 2층',
   '{"capacity_ton": 5000, "type": "hydraulic"}'),
  ('INSP-UT-01', 'UT 검사장 #1','inspection','idle',   'C동 1층',
   '{"type": "ultrasonic", "frequency_mhz": [2.25, 5]}')
ON CONFLICT (equipment_code) DO NOTHING;

-- ─────────────────────────────────────────
-- 코드 마스터 초기 데이터
-- ─────────────────────────────────────────
INSERT INTO code_master (category, code, name, name_en, sort_order) VALUES
  -- 강종 코드
  ('material_type','SM45C',  '기계구조용 탄소강 SM45C',   'Carbon Steel SM45C',   1),
  ('material_type','SCM440', '크롬몰리브덴강 SCM440',     'Cr-Mo Steel SCM440',   2),
  ('material_type','SCM415', '크롬몰리브덴강 SCM415',     'Cr-Mo Steel SCM415',   3),
  ('material_type','STS304', '오스테나이트 스테인리스',   'Austenitic SUS304',    4),
  ('material_type','S45C',   '기계구조용 탄소강 S45C',    'Carbon Steel S45C',    5),
  -- 불량 코드
  ('defect_code','DC-DIM',   '치수 불량',                 'Dimension Defect',     1),
  ('defect_code','DC-SFC',   '표면 결함',                 'Surface Defect',       2),
  ('defect_code','DC-INT',   '내부 결함 (UT)',             'Internal Defect (UT)', 3),
  ('defect_code','DC-MECH',  '기계적 성질 미달',          'Mechanical Failure',   4),
  ('defect_code','DC-CHEM',  '성분 불량',                 'Chemical Failure',     5),
  -- 검사 타입
  ('inspection_type','dimension', '치수 검사', 'Dimension', 1),
  ('inspection_type','ut',        'UT 검사',   'UT',        2),
  ('inspection_type','mt',        'MT 검사',   'MT',        3),
  ('inspection_type','hardness',  '경도 검사', 'Hardness',  4),
  ('inspection_type','tensile',   '인장 시험', 'Tensile',   5),
  ('inspection_type','visual',    '육안 검사', 'Visual',    6)
ON CONFLICT (category, code) DO NOTHING;

-- ─────────────────────────────────────────
-- 관리자 계정 (최초 1회)
-- 비밀번호: 최초 로그인 후 반드시 변경 (Tw@2026!MES)
-- ─────────────────────────────────────────
INSERT INTO users (email, password_hash, name, department) VALUES
  ('admin@taewung.com',
   '$2b$12$placeholder_change_on_first_login',  -- bcrypt hash, 실제 배포 전 변경 필수
   '시스템 관리자', 'IT팀')
ON CONFLICT (email) WHERE deleted_at IS NULL DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'admin@taewung.com' AND r.role_code = 'admin'
ON CONFLICT DO NOTHING;
