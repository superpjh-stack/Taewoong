---
name: project-docker-stack
description: How the TaeWoong AI-MES local Docker dev stack is wired (compose services, startup ordering, image choices)
metadata:
  type: project
---

The local dev stack is defined in `docker-compose.yml` at repo root. Services: `db`, `redis`, `migrate` (one-shot), `api`, `web`.

**Why:** Task on 2026-05-25 asked for a single `docker compose up -d` to boot the whole pnpm monorepo stack (Next.js web :3000, Express api :4000, Postgres/TimescaleDB :5432, Redis :6379).

**How to apply:**
- `db` image is `timescale/timescaledb-ha:pg16` — the HA variant. Its PGDATA is `/home/postgres/pgdata/data` (NOT the standard `/var/lib/postgresql/data`); the volume mount targets that path. The HA image bundles timescaledb + pgvector + pg_trgm + uuid-ossp, which `001_extensions.sql` requires.
- Startup ordering uses healthchecks + `depends_on` conditions: db healthy -> `migrate` runs `pnpm db:migrate && pnpm db:seed` then exits -> `api` waits on `migrate` `service_completed_successfully` -> `web` waits on api `service_healthy`.
- Inter-container DNS uses service names (`db`, `redis`), so compose overrides `DATABASE_URL`/`REDIS_URL` in the `environment:` blocks (the `.env` localhost values are for host-direct `pnpm dev`).
- Dev images target the `dev` stage in each Dockerfile (tsx watch / next dev) with source bind-mounted and anonymous volumes protecting container `node_modules`.
- Build context for both Dockerfiles is the repo ROOT (not the app dir) so workspace package `@taewung/types` resolves. See [[project-migrate-runner]].
