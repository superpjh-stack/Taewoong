---
name: project-migrate-runner
description: The api db:migrate runner and the env-file handling quirks in the Express API dev script
metadata:
  type: project
---

`apps/api/src/db/migrate.ts` is the migration runner (created 2026-05-25 — the `db:migrate` npm script referenced it but the file did not exist). It applies `src/db/migrations/*.sql` in filename order, tracking applied files in a `schema_migrations` table to stay idempotent. The seed runner `src/db/seed.ts` already existed and runs `src/db/seeds/*.sql` in sorted order (so `admin_user.sql` runs after `001-004`).

**Why:** Auto-running migrations + seeds on `docker compose up` requires both runners; only the seed one existed.

**How to apply:**
- Both `db:migrate` and `db:seed` scripts use `node --import tsx/esm` (the old `--loader tsx` form was replaced for consistency with `dev`).
- The api `dev` script uses `--env-file-if-exists=.env` (NOT `--env-file=.env`). Reason: in the container there is no `.env` (it's dockerignored; env comes from compose `environment:`), and a hard `--env-file` would crash on the missing file. `--env-file-if-exists` needs Node >= 20.12, satisfied by the `node:20-alpine` base image.
- DB client (`src/db/client.ts`) uses postgres.js with `transform: postgres.camel` (snake_case DB -> camelCase JS) and suppresses TimescaleDB NOTICEs via `onnotice`.
- Related: [[project-docker-stack]].
