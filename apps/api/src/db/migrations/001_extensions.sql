-- 001_extensions.sql
-- PostgreSQL 확장 설치 (최초 1회, superuser 권한 필요)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS vector;           -- pgvector (RAG 임베딩)
CREATE EXTENSION IF NOT EXISTS pg_trgm;          -- 한글 Full-Text 검색용
