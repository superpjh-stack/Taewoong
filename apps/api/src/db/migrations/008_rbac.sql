-- 008_rbac.sql
-- 사용자, 역할, 권한, 감사 로그

-- ─────────────────────────────────────────
-- users
-- ─────────────────────────────────────────
CREATE TABLE users (
  id              BIGSERIAL     PRIMARY KEY,
  email           VARCHAR(200)  NOT NULL,
  password_hash   VARCHAR(255)  NOT NULL,
  name            VARCHAR(100)  NOT NULL,
  department      VARCHAR(100),
  employee_no     VARCHAR(30),
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_users_email ON users (email) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────
-- roles (역할)
-- admin: 전체 관리  process: 공정 담당  quality: 품질 담당  viewer: 조회 전용
-- ─────────────────────────────────────────
CREATE TABLE roles (
  id          BIGSERIAL    PRIMARY KEY,
  role_code   VARCHAR(30)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_roles_code ON roles (role_code);

-- ─────────────────────────────────────────
-- permissions (권한)
-- 형식: {resource}:{action}  예: incoming:read, shipment:approve
-- ─────────────────────────────────────────
CREATE TABLE permissions (
  id          BIGSERIAL    PRIMARY KEY,
  perm_code   VARCHAR(100) NOT NULL,               -- 예: 'incoming:read'
  resource    VARCHAR(50)  NOT NULL,               -- 'incoming', 'heating', 'shipment'
  action      VARCHAR(30)  NOT NULL,               -- 'read', 'write', 'delete', 'approve', 'export'
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_permissions_code ON permissions (perm_code);

-- ─────────────────────────────────────────
-- user_roles / role_permissions (N:M)
-- ─────────────────────────────────────────
CREATE TABLE user_roles (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by BIGINT REFERENCES users(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
  role_id       BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ─────────────────────────────────────────
-- audit_logs (감사 로그 — Append-Only)
-- ─────────────────────────────────────────
CREATE TABLE audit_logs (
  id           BIGSERIAL    PRIMARY KEY,
  user_id      BIGINT       REFERENCES users(id),
  action       VARCHAR(50)  NOT NULL,              -- 'create', 'update', 'delete', 'approve', 'login'
  resource     VARCHAR(50)  NOT NULL,              -- 'lot', 'shipment', 'heating_recipe', ...
  resource_id  BIGINT,
  ip_address   INET,
  user_agent   TEXT,
  payload      JSONB,                              -- 변경 전/후 데이터 diff
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_user     ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs (resource, resource_id, created_at DESC);
CREATE INDEX idx_audit_created  ON audit_logs (created_at DESC);

-- ─────────────────────────────────────────
-- users 테이블 생성 후 지연 FK 추가
-- (003~007 에서 users(id)를 참조했으나 아직 테이블 미생성 상태였음)
-- ─────────────────────────────────────────
ALTER TABLE heating_processes
  ADD CONSTRAINT fk_hp_operator FOREIGN KEY (operator_id) REFERENCES users(id);

ALTER TABLE process_results
  ADD CONSTRAINT fk_pr_operator FOREIGN KEY (operator_id) REFERENCES users(id);

ALTER TABLE quality_inspections
  ADD CONSTRAINT fk_qi_inspector FOREIGN KEY (inspector_id) REFERENCES users(id);

ALTER TABLE shipments
  ADD CONSTRAINT fk_ship_approved_by FOREIGN KEY (approved_by) REFERENCES users(id);

ALTER TABLE ai_agent_sessions
  ADD CONSTRAINT fk_ai_user FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE notifications
  ADD CONSTRAINT fk_notif_user FOREIGN KEY (target_user_id) REFERENCES users(id);

ALTER TABLE kpi_targets
  ADD CONSTRAINT fk_kpi_target_user FOREIGN KEY (set_by) REFERENCES users(id);

ALTER TABLE heating_recipes
  ADD CONSTRAINT fk_recipe_approved FOREIGN KEY (approved_by) REFERENCES users(id);
