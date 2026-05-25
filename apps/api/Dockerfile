# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────
# TaeWoong AI-MES — API (Express, pnpm monorepo)
# Build context = repository root (so workspace packages resolve)
# ─────────────────────────────────────────────────────────────

# ---- base: pnpm enabled node ----------------------------------
FROM node:20-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ---- deps: install full workspace deps (cached on lockfile) ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/types/package.json ./packages/types/package.json
RUN pnpm install --frozen-lockfile

# ---- dev: hot-reload target used by docker-compose -------------
FROM deps AS dev
COPY . .
WORKDIR /app/apps/api
EXPOSE 4000
# tsx watch — source is bind-mounted by compose for live reload
CMD ["pnpm", "dev"]

# ---- build: compile TypeScript for production ------------------
FROM deps AS build
COPY . .
RUN pnpm --filter @taewung/api build

# ---- runner: lean production image -----------------------------
FROM base AS runner
ENV NODE_ENV=production
# production-only deps for the api workspace
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/types/package.json ./packages/types/package.json
RUN pnpm install --frozen-lockfile --prod --filter @taewung/api...
# compiled output + workspace type source (consumed at runtime via tsx-free dist)
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/types ./packages/types
# migration / seed SQL + runners (compiled) for db:migrate / db:seed
COPY --from=build /app/apps/api/src/db ./apps/api/src/db
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/index.js"]
