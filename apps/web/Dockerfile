# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────
# TaeWoong AI-MES — Web (Next.js 14, pnpm monorepo)
# Build context = repository root (so workspace packages resolve)
# ─────────────────────────────────────────────────────────────

# ---- base ------------------------------------------------------
FROM node:20-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ---- deps ------------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/types/package.json ./packages/types/package.json
RUN pnpm install --frozen-lockfile

# ---- dev: hot-reload target used by docker-compose -------------
FROM deps AS dev
COPY . .
WORKDIR /app/apps/web
EXPOSE 3000
# next dev — source is bind-mounted by compose for live reload
CMD ["pnpm", "dev"]

# ---- build: produce standalone output --------------------------
FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @taewung/web build

# ---- runner: minimal standalone server -------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
# Next.js standalone bundle (includes traced node_modules)
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
