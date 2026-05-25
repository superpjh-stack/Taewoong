# 신규 모듈 아키텍처 설계

> TaeWoong AI-MES — 기준정보관리 / 데이터관리 모듈
> 작성일: 2026-05-21 · 대상: 사업계획서 p.40-43 기능구조도 기준 누락 2개 모듈
> 정본(SoR): 코드베이스 우선. 본 문서는 설계 의도 제공용이며 코드와 충돌 시 코드가 우선.

## 0. 코드베이스 실측 결과 (설계 전제)

본 설계는 추측이 아니라 현재 코드베이스에서 확인한 실제 패턴을 따른다.

| 항목 | 실측 사실 | 출처 |
|------|-----------|------|
| 라우트 패턴 | `Router()` + `router.use(authenticate)` + `requirePermission('domain:action')` + `* as ctrl` | `apps/api/src/routes/raw-materials.ts` |
| 컨트롤러 패턴 | zod `safeParse` → `error(res, ErrorCode.VALIDATION_ERROR, …, 400, issues)` → `svc.*` 호출 → `ok`/`paginated` | `apps/api/src/controllers/quality-controller.ts` |
| 서비스 패턴 | postgres.js `sql` tagged template, `{ data, total }` 반환, `WHERE deleted_at IS NULL`, 조건부 `${cond ? sql\`…\` : sql\`\`}` | `apps/api/src/services/quality-service.ts` |
| 응답 헬퍼 | `ok` / `paginated(res, data, total, page, limit)` / `error(res, code, msg, status, details)` | `apps/api/src/lib/response.ts` |
| 권한 미들웨어 | `requirePermission(perm)` 일반, `adminOnly` 관리자 전용 | `routes/admin.ts` |
| 라우트 등록 | `apps/api/src/routes/index.ts` 의 `router.use('/kebab-plural', xRouter)` | `routes/index.ts` |
| 프론트 서비스 | `apiClient.get/post/patch`, `toQS()` 쿼리스트링 헬퍼, `{ data, pagination }` 반환 | `apps/web/lib/services/quality-service.ts` |
| 프론트 페이지 | `'use client'`, `PageHeader`+`Card`+`Table`+`Dialog`+`Pagination`, `ApiError` 처리 | `apps/web/app/(protected)/quality/page.tsx` |
| 사이드바 | `NAV_GROUPS` 배열 (그룹 = 구분선), `lucide-react` 아이콘, `pathname.startsWith(href+'/')` active 판정 | `apps/web/components/layout/Sidebar.tsx` |
| zod 위치 | `@taewung/types/zod` 단일 배럴, `paginationSchema`/`dateRangeSchema` 재사용 | `packages/types/src/zod/index.ts` |

### ⚠️ 설계에 영향을 주는 실측 사실 (중요)

1. **테이블명이 단수 `code_master`** 이다 (요구사항의 `code_masters` 아님). DB 스키마 정본은 `code_master`. → 신규 엔드포인트는 REST 규약상 `/code-masters` (복수) 로 노출하되, 서비스 레이어 SQL은 `code_master` 테이블을 참조한다.
2. **`code_master` CRUD는 이미 `/admin/code-master` 에 존재** (`adminOnly`). 신규 `/code-masters` 와 중복된다. → 아래 3.2 에서 **재배치(rename) 전략**으로 해소한다. 신규로 또 만들지 않는다.
3. **`quality_specs` / `work_standards` 는 `deleted_at` 컬럼이 없다** (`002_master_tables.sql` 확인). soft delete 대신 **`is_active` 플래그 + `version` 컬럼**을 사용한다. → DELETE 는 `is_active=false` 로 구현(논리 비활성화). 마이그레이션으로 `deleted_at` 추가는 선택사항(3.1 참조).
4. **`equipment` 조인 컬럼 불일치**: 마스터 정의는 `equipment_code`/`name` 이나 `lot-service.ts` 는 `e.code`/`e.name` 를 참조. → 데이터통합 뷰 작성 시 실제 컬럼명을 마이그레이션에서 재확인 후 결정(리스크로 명시).

---

## 1. 기준정보관리 아키텍처

대상 테이블: `quality_specs`, `work_standards`, `code_master` (모두 마이그레이션 `002`에 존재). 신규 작업은 **API 라우트/컨트롤러/서비스 + 프론트 페이지**에 한정된다. 새 테이블 생성 없음.

### 1.1 API 엔드포인트 설계

신규 권한 코드: `reference:read`, `reference:write` (RBAC seed에 추가 필요 — 4장 의존성 참조).

```
# 품질기준 (quality_specs)
GET    /quality-specs            reference:read   목록 (페이지네이션, material_type/customer_code/inspection_type 필터)
GET    /quality-specs/:id        reference:read   단건
POST   /quality-specs            reference:write  생성 (version=1 자동)
PUT    /quality-specs/:id        reference:write  신규 버전 생성 또는 메타 수정
DELETE /quality-specs/:id        reference:write  is_active=false (논리 비활성화)

# 작업표준 (work_standards)
GET    /work-standards           reference:read   목록 (process_type 필터)
GET    /work-standards/:id       reference:read   단건
POST   /work-standards           reference:write  생성
PUT    /work-standards/:id       reference:write  수정/버전업
DELETE /work-standards/:id       reference:write  is_active=false

# 코드관리 (code_master) — /admin/code-master 에서 재배치
GET    /code-masters             reference:read   목록 (category 필터)
GET    /code-masters/:id         reference:read   단건
POST   /code-masters             reference:write  생성
PUT    /code-masters/:id         reference:write  수정
DELETE /code-masters/:id         reference:write  is_active=false
```

> REST 규약: kebab-case 복수형 (프로젝트 정본 규약 준수). `PUT` 전체 교체 시맨틱이나, 기존 코드가 `PATCH`(부분 수정)를 쓰므로 컨트롤러 내부는 부분 수정 + 명시 필드만 갱신으로 구현하고 라우트는 요구사항대로 `PUT` 노출. 일관성을 위해 `PATCH`도 동일 핸들러로 alias 가능.

신규 파일:
```
apps/api/src/routes/reference.ts                 # 3개 리소스를 하나의 라우터로 묶음 (또는 3개 분리)
apps/api/src/controllers/reference-controller.ts # qualitySpec*, workStandard*, codeMaster* 핸들러
apps/api/src/services/reference-service.ts        # SQL 레이어
```

라우트 등록 (`routes/index.ts`):
```ts
import referenceRouter from './reference.js'
// 단일 라우터 내부에서 sub-path 분기, 또는 3개 등록:
router.use('/quality-specs', referenceRouter)   // 권장: 리소스별 라우터 3개 분리해 quality.ts 와 동일 패턴 유지
router.use('/work-standards', referenceRouter)
router.use('/code-masters', referenceRouter)
```

> 권장: 기존 코드는 도메인당 라우트 파일 1개 패턴이므로, `reference-quality-specs.ts` / `reference-work-standards.ts` / `reference-code-masters.ts` 3개로 분리하는 편이 패턴 일관성이 높다. 아래 서비스/컨트롤러는 단일 파일로 묶고 라우트만 3개로 두는 절충안 채택.

### 1.2 서비스 레이어 설계

`quality-service.ts` 와 동일한 시그니처/구조를 따른다 (`{ data, total }`, 조건부 `sql` 보간, soft delete 대신 `is_active`).

```ts
// apps/api/src/services/reference-service.ts
import { sql } from '../db/client.js'

// ── quality_specs ──
export async function listQualitySpecs(p: {
  page: number; limit: number
  materialType?: string; customerCode?: string; inspectionType?: string; activeOnly?: boolean
}): Promise<{ data: unknown[]; total: number }> {
  const offset = (p.page - 1) * p.limit
  const [{ count }] = await sql<[{ count: string }]>`
    SELECT COUNT(*) AS count FROM quality_specs
    WHERE 1=1
      ${p.activeOnly ? sql`AND is_active = true` : sql``}
      ${p.materialType ? sql`AND material_type = ${p.materialType}` : sql``}
      ${p.customerCode ? sql`AND customer_code = ${p.customerCode}` : sql``}
      ${p.inspectionType ? sql`AND inspection_type = ${p.inspectionType}` : sql``}
  `
  const data = await sql`
    SELECT * FROM quality_specs
    WHERE 1=1
      ${p.activeOnly ? sql`AND is_active = true` : sql``}
      ${p.materialType ? sql`AND material_type = ${p.materialType}` : sql``}
      ${p.customerCode ? sql`AND customer_code = ${p.customerCode}` : sql``}
      ${p.inspectionType ? sql`AND inspection_type = ${p.inspectionType}` : sql``}
    ORDER BY spec_code, version DESC
    LIMIT ${p.limit} OFFSET ${offset}
  `
  return { data, total: Number(count) }
}

export async function createQualitySpec(d: Record<string, unknown>) {
  const [row] = await sql`INSERT INTO quality_specs ${sql({ ...d, version: 1 } as never)} RETURNING *`
  return row
}

// 버전업: 동일 spec_code 의 최신 version+1 로 새 행 INSERT (이력 보존)
export async function reviseQualitySpec(specCode: string, d: Record<string, unknown>) {
  const [{ v }] = await sql<[{ v: number }]>`
    SELECT COALESCE(MAX(version), 0) AS v FROM quality_specs WHERE spec_code = ${specCode}
  `
  const [row] = await sql`INSERT INTO quality_specs ${sql({ ...d, spec_code: specCode, version: v + 1 } as never)} RETURNING *`
  return row
}

export async function deactivateQualitySpec(id: number) {
  const [row] = await sql`UPDATE quality_specs SET is_active=false, updated_at=NOW() WHERE id=${id} RETURNING *`
  return row ?? null
}
// work_standards / code_master 도 동일 구조 (process_type / category 필터)
```

> **품질기준 버전 정책 (트레이서빌리티 영향)**: `quality_specs` 는 `(spec_code, version)` UNIQUE. 검사 결과는 적용 시점의 spec_id 를 참조해야 사후 역추적이 가능하다. 따라서 기준 변경 시 **in-place UPDATE 금지, 신규 version INSERT** 가 원칙(위 `reviseQualitySpec`). 이는 LOT→검사→적용기준 역추적 무결성을 보장한다.

### 1.3 프론트엔드 페이지 구조

`quality/page.tsx` 패턴(Table+Dialog+Pagination, `apiClient`, `ApiError`)을 그대로 따른다.

```
apps/web/app/(protected)/reference-info/
├── layout.tsx                      # 탭 네비 (3개 하위 페이지 공유 헤더)
├── page.tsx                        # 인덱스 → /reference-info/quality-specs 리다이렉트 또는 카드 3개
├── quality-specs/page.tsx          # 품질기준 CRUD (criteria JSONB 편집 UI)
├── work-standards/page.tsx         # 작업표준 CRUD (content TEXT + attachment_url)
└── code-masters/page.tsx           # 코드 관리 CRUD (category별 그룹 뷰)

apps/web/lib/services/reference-service.ts   # listQualitySpecs / createQualitySpec / ... (quality-service.ts 미러)
```

페이지별 핵심 UI:
- **quality-specs**: `criteria` 가 JSONB(min/max/grade) 이므로 폼은 동적 키-값 에디터 또는 inspection_type 별 프리셋. version은 읽기전용, "신규 버전 생성" 버튼이 `PUT` 호출.
- **work-standards**: `content` 는 멀티라인 textarea, `attachment_url` 은 링크 입력(파일 업로드는 별도 스토리지 연동 — 본 모듈 범위 외, TODO 명시).
- **code-masters**: `category` 셀렉트 + 해당 카테고리 코드 목록. 기존 `/admin/code-master` UI가 있다면 그것을 이전/링크.

---

## 2. 데이터관리 아키텍처

5개 기능: 데이터통합관리 / 데이터조회(LOT 기반) / 데이터시각화 / 데이터다운로드(CSV·Excel) / AI학습데이터관리.

핵심 설계 원칙: **신규 트랜잭션 테이블을 만들지 않는다.** 데이터관리는 기존 도메인 테이블(heats, lots, process_results, quality_inspections, sensor_data 등)에 대한 **읽기 전용 통합 뷰 + 내보내기** 계층이다. 쓰기는 AI학습데이터셋 메타 관리에 한정.

### 2.1 API 엔드포인트 설계

신규 권한: `data:read`, `data:export`, `data:ai-train`.

```
# 데이터통합 조회 (LOT 중심 통합 레코드)
GET  /data/integrated                data:read    LOT 기준 통합 행 (입고~출하 평탄화), 필터+페이지네이션
GET  /data/integrated/:lotId         data:read    단일 LOT 전체 라이프사이클 (lot-service.getLotHistory 재사용 확장)

# 데이터조회 (LOT 기반 상세 — 기존 lot-service 재사용)
GET  /data/query                     data:read    다중 조건 조회 (heat_no, lot_no, 기간, stage, customer)

# 데이터시각화 (집계 — 차트용 시계열/분포)
GET  /data/viz/timeseries            data:read    sensor_aggregates 기반 시계열 (equipment/metric/기간)
GET  /data/viz/distribution          data:read    품질판정/불량유형 분포 등 집계

# 데이터다운로드
GET  /data/export?format=csv|xlsx    data:export   통합 조회 결과를 스트리밍 export (필터 = /data/integrated 동일)

# AI학습데이터관리
GET    /data/ai-datasets             data:read       데이터셋 목록
POST   /data/ai-datasets             data:ai-train   데이터셋 정의 생성 (쿼리조건+라벨링 기준 스냅샷)
GET    /data/ai-datasets/:id         data:read       데이터셋 상세 + 통계
POST   /data/ai-datasets/:id/export  data:ai-train   학습용 추출(피처/라벨) → S3/파일 (스토리지 연동 TODO)
DELETE /data/ai-datasets/:id         data:ai-train   is_active=false
```

신규 파일:
```
apps/api/src/routes/data.ts
apps/api/src/controllers/data-controller.ts
apps/api/src/services/data-service.ts          # 통합 JOIN, 집계, export 쿼리
apps/api/src/services/data-export-service.ts   # CSV/XLSX 직렬화 (스트리밍)
```

신규 테이블 1개 (AI학습데이터셋 메타만):
```sql
-- 010_ai_datasets.sql
CREATE TABLE ai_datasets (
  id            BIGSERIAL    PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  query_filter  JSONB        NOT NULL,   -- 추출 조건 스냅샷 (재현성)
  feature_spec  JSONB        NOT NULL,   -- 사용 컬럼/피처 정의
  label_spec    JSONB,                   -- 라벨 정의 (예: judgement = pass/fail)
  row_count     INTEGER      NOT NULL DEFAULT 0,
  storage_url   TEXT,                    -- 추출 산출물 위치
  created_by    BIGINT       REFERENCES users(id),
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_datasets_active ON ai_datasets (is_active);
```

> `query_filter` 스냅샷 보존 이유: AI 학습 데이터의 **재현성**. 동일 데이터셋을 같은 조건으로 재추출할 수 있어야 모델 재학습/감사가 가능하다.

### 2.2 데이터 통합 조회 전략 (JOIN 설계)

**LOT 을 통합의 중심축**으로 둔다 (트레이서빌리티 모델과 일치). 한 행 = 한 LOT 의 전 생애주기 요약.

```sql
-- data-service.ts: listIntegrated()
SELECT
  l.id            AS lot_id,
  l.lot_no,
  l.current_stage,
  l.status,
  l.customer_code,
  h.heat_no,
  h.id            AS heat_id,
  -- 입고/소재
  rm.material_type,
  s.name          AS supplier_name,
  -- 가열공정 (최신 1건)
  hp.recipe_id,
  hp.target_temp_c,
  hp.completed_at AS heating_completed_at,
  -- 공정 결과 집계
  (SELECT COUNT(*) FROM process_results pr WHERE pr.lot_id = l.id) AS process_count,
  -- 품질 (최종 판정)
  qi.insp_status,
  qi.judgement,
  qi.ai_anomaly_score,
  -- 출하
  sh.shipped_at,
  l.created_at,
  l.updated_at
FROM lots l
LEFT JOIN heats h            ON h.id = l.heat_id
LEFT JOIN heat_materials hm  ON hm.heat_id = h.id
LEFT JOIN raw_materials rm   ON rm.id = hm.raw_material_id
LEFT JOIN suppliers s        ON s.id = rm.supplier_id
LEFT JOIN LATERAL (
  SELECT * FROM heating_processes hp2 WHERE hp2.lot_id = l.id
  ORDER BY hp2.created_at DESC LIMIT 1
) hp ON true
LEFT JOIN LATERAL (
  SELECT * FROM quality_inspections q2 WHERE q2.lot_id = l.id AND q2.deleted_at IS NULL
  ORDER BY q2.created_at DESC LIMIT 1
) qi ON true
LEFT JOIN LATERAL (
  SELECT * FROM shipments sp WHERE sp.lot_id = l.id
  ORDER BY sp.created_at DESC LIMIT 1
) sh ON true
WHERE l.deleted_at IS NULL
  -- 동적 필터 (quality-service 의 조건부 s`` 패턴 동일):
  ${heatNo ? sql`AND h.heat_no = ${heatNo}` : sql``}
  ${lotNo ? sql`AND l.lot_no ILIKE ${'%'+lotNo+'%'} ` : sql``}
  ${stage ? sql`AND l.current_stage = ${stage}` : sql``}
  ${customer ? sql`AND l.customer_code = ${customer}` : sql``}
  ${from ? sql`AND l.created_at >= ${from}` : sql``}
  ${to ? sql`AND l.created_at <= ${to}` : sql``}
ORDER BY l.created_at DESC
LIMIT ${limit} OFFSET ${offset}
```

설계 결정 및 트레이드오프:

| 옵션 | 장점 | 단점 | 결정 |
|------|------|------|------|
| A. 매 요청 런타임 JOIN (위 쿼리) | 항상 최신, 추가 저장소 없음 | LATERAL 다중 조인 비용, 대량 시 느림 | **MVP 채택** |
| B. Materialized View (`mv_lot_integrated`) | 조회 빠름, export 안정 | 갱신 주기/REFRESH 필요, 약간의 지연 | 데이터량 증가 시 전환 (P2) |
| C. ETL 전용 테이블 | 최고 성능, 분석 분리 | 파이프라인/중복 데이터/정합성 부담 | 현 단계 과설계, 비채택 |

> 다중 `LEFT JOIN LATERAL ... LIMIT 1` 은 "LOT당 최신 1건"을 안전하게 평탄화하기 위함. 단순 LEFT JOIN 시 카디널리티 폭증(공정 N건 × 검사 M건). 인덱스 전제: `quality_inspections(lot_id, created_at)`, `heating_processes(lot_id, created_at)`, `shipments(lot_id, created_at)`. 부재 시 마이그레이션 추가 필요(성능 리스크).

### 2.3 다운로드 API 설계 (CSV export)

```ts
// data-export-service.ts
// 1) 동일 필터로 data-service.streamIntegrated() 를 cursor 로 순회 (전체 결과를 메모리에 적재 금지)
// 2) postgres.js cursor: for await (const rows of sql`...`.cursor(500)) { ... }
// 3) CSV: 헤더 1행 + row 직렬화, 한글 Excel 호환 위해 UTF-8 BOM 선행

export async function exportIntegratedCsv(res: Response, filter: IntegratedFilter) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="lot-integrated-${Date.now()}.csv"`)
  res.write('﻿')                       // UTF-8 BOM (Excel 한글 깨짐 방지)
  res.write(CSV_HEADER + '\n')
  for await (const rows of buildIntegratedQuery(filter).cursor(500)) {
    for (const r of rows) res.write(toCsvRow(r) + '\n')
  }
  res.end()
}
```

설계 결정:
- **스트리밍 + cursor(500)**: 대량 export 시 OOM 방지. `paginated` 헬퍼는 미사용(스트림 응답이므로 표준 JSON 래퍼 우회 — 예외 케이스로 명시).
- **CSV 우선, XLSX 후순위**: CSV 는 의존성 0. XLSX 는 `exceljs` 등 추가 의존성 + 스트리밍 복잡 → P2. `format=xlsx` 는 초기엔 501 또는 CSV fallback.
- **권한 분리**: 조회(`data:read`)와 내보내기(`data:export`)를 분리. 대량 반출은 감사 대상이므로 export 시 `audit_logs` 기록.
- **행 수 상한**: 무제한 export 방지를 위해 기본 상한(예 10만 행) + 초과 시 비동기 잡 안내(P2).

### 2.4 프론트엔드 페이지 구조

```
apps/web/app/(protected)/data-management/
├── layout.tsx                  # 5개 하위 탭 공유 셸
├── page.tsx                    # 인덱스 (5개 기능 카드 + 요약 통계)
├── integrated/page.tsx         # 데이터통합관리 — /data/integrated 테이블 (전 컬럼)
├── query/page.tsx              # 데이터조회 — heat_no/lot_no/기간 조건 → 결과 + LOT 상세 드릴다운
├── visualization/page.tsx      # 데이터시각화 — /data/viz/* 차트 (recharts 등 기존 KPI 차트 컴포넌트 재사용)
├── download/page.tsx           # 데이터다운로드 — 필터 폼 + format 선택 → window.location = export URL
└── ai-training/page.tsx        # AI학습데이터관리 — ai_datasets CRUD + 추출 트리거

apps/web/lib/services/data-service.ts   # listIntegrated / queryByLot / vizTimeseries / aiDatasets...
```

핵심 UI 결정:
- **download**: 다운로드는 fetch 가 아니라 `<a href>` / `window.location` 으로 브라우저 네이티브 다운로드 트리거(스트림 응답이므로). 인증 토큰은 쿠키 기반이면 그대로, 헤더 기반이면 단기 서명 URL 또는 토큰 쿼리 처리 필요(인증 방식 확인 TODO).
- **visualization**: KPI 모듈에 이미 차트 컴포넌트가 있을 가능성 높음 → 재사용. 시계열은 `sensor_aggregates`(롤업) 사용, raw `sensor_data` 직접 조회 금지(TimescaleDB 부하).
- **query → LOT 상세**: 기존 `/lots/[id]/page.tsx` 의 lineage 뷰로 링크하여 중복 구현 회피.

---

## 3. 사이드바 재구조화 전략

### 현재 (flat, 7개 항목)
`/dashboard · /raw-materials · /lots · /heating · /processes · /shipments · /quality · /ai-agent · /kpi · /admin`

### 목표: 기능구조도 기준 그룹화 + 신규 2개 추가

`Sidebar.tsx` 의 `NAV_GROUPS` 구조(그룹 = 구분선)를 활용해 다음과 같이 재편:

```
[운영]      대시보드(/dashboard) · AI Agent(/ai-agent)
[생산]      입고배합(/raw-materials) · LOT(/lots) · 가열공정(/heating) · 단조/열처리(/processes)
[품질·출하] 검사출하(/shipments) · 품질검사(/quality)
[분석]      KPI 분석(/kpi) · 데이터관리(/data-management)        ← 신규
[기준정보]  기준정보관리(/reference-info)                          ← 신규
[시스템]    시스템 관리(/admin)
```

신규 아이콘(`lucide-react`): 데이터관리 `Database`, 기준정보관리 `BookMarked` 또는 `FileText`.

### 3.1 URL 라우팅 변경 계획

- 신규 라우트만 추가, **기존 7개 URL 은 변경하지 않는다** (하위호환 100%). 사이드바는 그룹 라벨만 추가 — 링크 href 불변.
- 신규: `/reference-info/*`, `/data-management/*` 디렉터리 추가.
- 그룹 헤더 라벨 표시를 위해 `NavGroup` 에 선택적 `label` 필드 추가(현재는 `items` 만 존재 → 마이너 확장).

DB 마이그레이션(선택):
- 권장: `quality_specs`, `work_standards` 에 `deleted_at TIMESTAMPTZ` 추가하여 다른 테이블과 soft-delete 패턴 통일 → `011_reference_soft_delete.sql`. 미적용 시 `is_active` 로 대체(현 설계 기본값).
- 필수: `ai_datasets` 테이블 (`010_ai_datasets.sql`).
- 권장: 통합 조회 성능 인덱스 (`quality_inspections(lot_id, created_at)` 등).

### 3.2 기존 URL 하위호환성 처리 (`code-master` 재배치)

`code_master` CRUD 가 `/admin/code-master`(adminOnly)에 이미 존재하고, 신규 요구는 `/code-masters`(reference 권한). 중복을 다음과 같이 해소:

| 단계 | 조치 |
|------|------|
| 1 | `/code-masters` 신규 라우트를 정식 엔드포인트로 구현 (`reference:read/write`) |
| 2 | `/admin/code-master` 는 **deprecated**. 기존 admin 화면이 호출 중이므로 즉시 제거 금지 |
| 3 | `/admin/code-master/*` 핸들러를 신규 서비스(`reference-service`)로 위임(thin proxy)하여 로직 단일화 — 코드 중복 제거 |
| 4 | admin UI 가 신규 `/code-masters` 로 전환 완료되면 다음 마이너 버전에서 `/admin/code-master` 제거 |

> 프론트 URL 측: 기존 `/admin` 페이지 내 코드마스터 탭이 있으면 `/reference-info/code-masters` 로 점진 이전. admin 페이지에는 안내 링크 또는 redirect 유지(하위호환).

---

## 4. 구현 우선순위 및 의존성 그래프

### 의존성 그래프

```
[RBAC seed: reference:*, data:* 권한 추가]   ← 모든 신규 모듈의 선행 조건
        │
        ├──────────────┬───────────────────────────────┐
        ▼              ▼                               ▼
[reference-service]  [data-service (통합 JOIN)]     [010_ai_datasets.sql]
        │              │                               │
        ▼              ▼                               ▼
[reference routes/   [data routes/controller]       [ai-datasets CRUD]
 controller]          │
        │             ├── [data-export-service (CSV stream)]
        ▼             │
[reference-info       ▼
 프론트 3p]        [data-management 프론트 5p]
                       │
                       └── visualization (KPI 차트 컴포넌트 재사용에 의존)

[Sidebar NAV_GROUPS 재편] ← reference-info / data-management 라우트 존재 후 링크 연결
```

### 우선순위 (P0 → P2)

| 순위 | 작업 | 이유 / 선행 |
|------|------|-------------|
| **P0** | RBAC 권한 seed 추가 (`reference:read/write`, `data:read/export/ai-train`) | 모든 라우트가 `requirePermission` 에 의존 |
| **P0** | 기준정보관리 API (quality-specs, work-standards) | 테이블 존재, 의존성 없음, 가장 단순 (quality-service 미러) |
| **P0** | 기준정보관리 프론트 3페이지 | API 직후, 검증 가능한 최소 산출물 |
| **P1** | `/code-masters` 재배치 + `/admin/code-master` proxy 위임 | 중복 제거, 기존 동작 보존 |
| **P1** | 데이터통합 조회 API (`/data/integrated`, `/data/query`) + 인덱스 | 통합 JOIN 검증, 데이터관리 핵심 |
| **P1** | 데이터관리 프론트: integrated / query 페이지 | 통합 API 검증 |
| **P1** | CSV export (`data-export-service`) + download 페이지 + audit 기록 | integrated 쿼리 재사용 |
| **P1** | Sidebar 그룹 재편 + 신규 링크 연결 | 라우트 존재 후 |
| **P2** | 데이터시각화 (`/data/viz/*`) + visualization 페이지 | sensor_aggregates 기반, KPI 차트 재사용 |
| **P2** | `ai_datasets` 테이블 + AI학습데이터 CRUD + 추출 | 신규 테이블 마이그레이션 필요 |
| **P2** | XLSX export, 대량 export 비동기 잡, 파일 스토리지 연동 | 추가 의존성/인프라 |

### 검증 게이트 (bkit PDCA)
- 각 기능: `/pdca plan → design → 구현 → analyze(≥90%) → report`.
- 기준정보 P0 완료 시 통합 스모크: 품질기준 신규 버전 생성 → 검사 결과가 해당 spec_id 참조하는지 트레이서빌리티 무결성 확인.
- 데이터통합 P1 완료 시: 임의 LOT 의 통합 행이 입고→출하 단계와 lineage(`/lots/[id]`)와 일치하는지 교차검증.

---

## 5. 미해결 리스크 / 확인 필요 (구현 전 점검)

1. **`equipment` 컬럼명 불일치** (`equipment_code`/`name` vs `e.code`/`e.name`) — 통합 JOIN/뷰 작성 전 실제 스키마 재확인.
2. `quality_specs`/`work_standards` 의 soft delete 정책 — `is_active`(기본) vs `deleted_at` 추가 마이그레이션 중 택1 확정.
3. **인증 토큰 방식** (쿠키 vs Authorization 헤더) — CSV 다운로드의 `<a href>` 트리거 가능 여부 결정.
4. 통합 조회 성능 인덱스(`*_lot_id_created_at`) 존재 여부 — 부재 시 마이그레이션 선행.
5. KPI 모듈의 차트 컴포넌트 존재/재사용 가능성 — visualization 구현 방식 결정.
6. `code_master` 신규 `/code-masters` 권한 모델: 기존 adminOnly → reference 권한 전환이 운영 정책상 허용되는지 확인.
```
