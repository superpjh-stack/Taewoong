DO $$
DECLARE
  v_user_id bigint;
  v_role_id bigint;
BEGIN
  -- Insert admin user (partial unique index: email WHERE deleted_at IS NULL)
  INSERT INTO users (email, password_hash, name, department, is_active)
  VALUES (
    'admin@taewung.co.kr',
    '$2a$12$61Gq2YkVcHgH29djBawfsOajgAZZYr8GrMsFNd36T63WrHz5RHOHK',
    'Admin',
    'IT',
    true
  )
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_user_id FROM users WHERE email = 'admin@taewung.co.kr' AND deleted_at IS NULL;
  SELECT id INTO v_role_id FROM roles WHERE role_code = 'admin';

  IF v_user_id IS NOT NULL AND v_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
END $$;
