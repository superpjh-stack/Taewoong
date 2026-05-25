# [Design] phase-2-convention — 태웅 AI-MES 코딩 컨벤션

| 항목 | 내용 |
|------|------|
| Feature | phase-2-convention |
| Phase | Design (Pipeline Phase 2) |
| 작성일 | 2026-05-20 |
| 선행 조건 | phase-1-schema 완료 (Match Rate 100%) |

## 목표

모든 개발자가 동일한 규칙으로 코드를 작성하도록 프로젝트 컨벤션을 정의하고 자동화한다.

## 구현 파일 목록

| 파일 | 설명 |
|------|------|
| `CONVENTIONS.md` | 전체 코딩 컨벤션 문서 |
| `pnpm-workspace.yaml` | pnpm 모노레포 워크스페이스 설정 |
| `package.json` (root) | 루트 패키지 (스크립트, 의존성) |
| `turbo.json` | Turborepo 빌드 파이프라인 |
| `tsconfig.base.json` | TypeScript 기본 설정 |
| `apps/api/package.json` | API 서비스 패키지 |
| `apps/api/tsconfig.json` | API TypeScript 설정 |
| `apps/api/src/db/client.ts` | PostgreSQL 연결 (postgres.js) |
| `apps/api/src/lib/response.ts` | API 응답 표준화 헬퍼 |
| `apps/api/src/middleware/auth.ts` | JWT 인증 미들웨어 |
| `apps/api/src/middleware/rbac.ts` | RBAC 권한 미들웨어 |
| `.env.example` | 환경변수 템플릿 |
| `.eslintrc.json` | ESLint 설정 |
| `.prettierrc` | Prettier 설정 |
| `packages/types/src/zod/index.ts` | Zod 검증 스키마 (핵심 DTO) |

## 수용 기준 (AC)

- [ ] `pnpm install` 이 루트에서 오류 없이 실행된다
- [ ] TypeScript 컴파일 (`tsc --noEmit`) 이 오류 없이 통과한다
- [ ] ESLint (`pnpm lint`) 가 기본 파일에서 오류 없이 통과한다
- [ ] `.env.example` 이 모든 필수 환경변수를 포함한다
- [ ] `db/client.ts` 가 PostgreSQL에 연결하는 typed query 함수를 제공한다
- [ ] Zod 스키마가 핵심 DTO (CreateRawMaterial, CreateShipment, AiQuery) 를 검증한다
- [ ] API 응답 형식이 `{ success, data, message }` 로 일관되게 표준화된다
