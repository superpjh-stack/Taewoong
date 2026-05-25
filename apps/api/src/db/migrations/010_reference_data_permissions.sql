-- 010_reference_data_permissions.sql
-- 기준정보관리(reference-info) 및 데이터관리(data-management) 신규 권한 추가
--
-- 주의: 001_master_data.sql에 data:read(resource='data')는 이미 존재함
-- reference:read / reference:write 는 신규 추가
-- data:read / data:write 는 resource='data_management'로 별도 추가 (ON CONFLICT DO NOTHING)

INSERT INTO permissions (perm_code, resource, action, description) VALUES
  ('reference:read',  'reference_info',  'read',  '기준정보 조회'),
  ('reference:write', 'reference_info',  'write', '기준정보 관리'),
  ('data:read',       'data_management', 'read',  '데이터관리 조회'),
  ('data:write',      'data_management', 'write', '데이터관리 수정')
ON CONFLICT (perm_code) DO NOTHING;

-- admin: 신규 권한 전체 부여
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_code = 'admin'
  AND p.perm_code IN ('reference:read', 'reference:write', 'data:read', 'data:write')
ON CONFLICT DO NOTHING;

-- process, quality: 조회 권한만 부여
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.role_code IN ('process', 'quality')
  AND p.perm_code IN ('reference:read', 'data:read')
ON CONFLICT DO NOTHING;
