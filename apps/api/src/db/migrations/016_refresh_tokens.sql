-- 016_refresh_tokens.sql
-- Refresh Token DB 저장 테이블 (Phase 7 — REQ-03)
-- 로그아웃 무효화 + Refresh Token Rotation 지원

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,   -- SHA-256(refreshToken) hex
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ,                   -- NULL = 유효, NOT NULL = 무효화됨
  user_agent  TEXT,
  ip_address  INET
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- 만료된 토큰 자동 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens() RETURNS void AS $$
  DELETE FROM refresh_tokens WHERE expires_at < NOW();
$$ LANGUAGE sql;
