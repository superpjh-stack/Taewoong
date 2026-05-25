# QA Report — LOT 추적 + 공정관리 (QA Team 2)

## 분석 대상
- 경로: `apps/web/app/(protected)/lots/`, `apps/web/app/(protected)/processes/`
- 파일 수: 8
- 분석일: 2026-05-24
- 검증자: QA Team 2 (Dev Team 2 산출물)

| # | 파일 | 종류 |
|---|------|------|
| 1 | `lots/page.tsx` | Server Component (목록) |
| 2 | `lots/[id]/page.tsx` | Server Component (상세) |
| 3 | `processes/page.tsx` | Client (공정실적) |
| 4 | `processes/monitoring/page.tsx` | Client (실시간 모니터링) |
| 5 | `processes/conditions/page.tsx` | Client (작업조건 CRUD) |
| 6 | `processes/history/page.tsx` | Client (이력+타임라인) |
| 7 | `processes/analysis/page.tsx` | Client (집계분석) |
| 8 | `processes/performance/page.tsx` | Client (생산실적) |

## 품질 점수: 76/100

코딩 규칙(싱글 쿼트, 세미콜론 없음, 2스페이스, `any` 없음)과 컴포넌트 재사용은 전반적으로 우수.
점수 차감은 대부분 **프론트-API 계약 불일치(런타임 깨짐)**에서 발생.

---

## 발견된 이슈

### 🔴 Critical (즉시 수정 필요)

| 파일 | 라인 | 이슈 | 권장 조치 | 상태 |
|------|------|------|-----------|------|
| `processes/conditions/page.tsx` | (기존)88 | **목록 응답 형태 불일치.** 백엔드 `process-conditions.ts` GET은 `paginated()`가 아닌 `res.json({ data: { total, page, limit, items } })`를 반환. 페이지는 `setItems(res.data)` 로 객체를 배열 자리에 주입 → Table 깨짐, `res.pagination` 항상 undefined | `res.data.items` 로 읽도록 보정 + 엔드포인트를 `/process-conditions` 로 통일 | ✅ QA 수정 (방어 처리) |
| `processes/conditions/page.tsx` | 126-138 | **쓰기 스키마 불일치 (DB 저장 실패).** 백엔드 `work_standards` 컬럼은 `standard_code, title, content, revision`. 페이지는 `{ condition_name, steel_grade, is_active, parameters, note }` 를 POST/PATCH → `title`/`standard_code` NULL 로 INSERT 실패(500) 가능. `parameters`(JSON 배열) 저장 위치 없음 | **백엔드(Dev Team 2) 결정 필요.** 프론트 모델(조건명/강종/파라미터)에 맞춰 `work_standards` 스키마 또는 별도 `process_conditions` 테이블 신설. QA가 임의로 바꾸지 않음 | ⚠️ Dev 조치 대기 |
| `processes/history/page.tsx` | 87-97, 207-216 | **타임라인 응답 형태 불일치.** 백엔드 `lots/:id/process-timeline` 은 `{ lot_id, timeline: [{stage, started_at, completed_at, status, equipment_name}] }` 반환. 페이지는 `{ lot_no, heat_no, steps[] }` 기대 → `timeline.steps.map` 에서 `undefined` 크래시, `lot_no`/`heat_no` 헤더 빈칸 | 백엔드 응답을 `{ lot_no, heat_no, steps:[{process_label, duration_minutes, key_parameters...}] }` 형태로 정비 필요. QA는 `(timeline.steps ?? [])` 로 크래시만 방어 | ✅ QA 크래시 방어 / ⚠️ Dev 계약 정비 대기 |

> 참고: `processes/page.tsx`, `processes/performance/page.tsx`, `processes/history` 의 **목록**(`/process-results`)은
> 백엔드가 표준 `paginated()` 를 사용하므로 정상 동작. 계약 불일치는 conditions(목록·쓰기)와 timeline에 한정됨.

### 🟡 Warning (개선 권장)

| 파일 | 라인 | 이슈 | 권장 조치 |
|------|------|------|-----------|
| `processes/analysis/page.tsx` | 87-126 | `/process-analysis/*` 3개 엔드포인트 미구현. `Promise.allSettled` 로 실패 시 하드코딩 MOCK 데이터 표시 (의도된 fallback). 사용자에게 "샘플 데이터" 배너로 고지는 되나, 운영 배포 시 실데이터 미연결 상태가 가려질 위험 | 백엔드 `process-analysis` 라우터 구현 전까지 배포 보류 권장. 배너 문구 유지 |
| `processes/conditions/page.tsx` | 191-204, 311-335 | 백엔드 `work_standards` 행에 `parameters` 필드 부재 가능 → `params.length`/`selected.parameters.length` 접근 시 크래시 | `(v ?? [])`, `selected.parameters &&` 가드 추가 ✅ QA 수정 |
| `processes/monitoring/page.tsx` | 14-23 | `Equipment` 인터페이스에 `[key: string]: unknown` 인덱스 시그니처 → 사실상 타입 안전성 약화. 명시 필드만 사용 중이므로 제거 가능 | 인덱스 시그니처 제거 검토 (현재 기능 영향 없음) |
| `processes/conditions/page.tsx` | 98-99 | `useEffect` 2개가 각각 `activeTab`, `page` 의존 → 탭 변경 시 `load(1, tab)` 과 `page` effect 중복 호출 가능성 (page가 이미 1이면 1회). 경미 | 단일 effect 또는 page 리셋 일원화 고려 |
| 다수 (client pages) | - | `apiClient` 가 `localStorage.getItem('token')` 사용 (XSS 시 토큰 탈취 위험). 해당 페이지 고유 이슈는 아님(공통 클라이언트) | Phase 7 보안: httpOnly 쿠키 전환 검토 (앱 전역) |

### 🟢 Info (참고)

- `lots/page.tsx`, `lots/[id]/page.tsx` 는 **모범 사례**: Server Component 로 작성, `searchParams` 기반 URL 필터(`lot_no/status/current_stage`)가 실제 `listLots` 인자까지 정상 전달됨 → [[filter-ui-not-wired]] 안티패턴 없음.
- `lots/[id]/page.tsx` 의 `try/catch → notFound()` 처리, `Promise.all` 병렬 페치 적절.
- `lots/page.tsx` LOT 번호 → `/lots/${row.id}` 상세 링크 정상 연결 확인.
- 모든 목록/카드에 `emptyText` 빈 상태 메시지 존재 (Table/Card) — 검증 항목 충족.
- 공정 유형 라벨은 `@/lib/constants/process` 의 `PROCESS_TYPE_OPTS`/`getProcessLabel` 로 공통화됨. 단, `processes/page.tsx` 만 자체 `PROCESS_TYPE_OPTS` 상수를 로컬 재정의(중복) → `constants/process` 로 통일 권장 (DRY).

---

## 검증 항목별 결과

| 항목 | 결과 | 비고 |
|------|------|------|
| 1. TypeScript 품질 (no `any`) | ✅ Pass | `any` 미사용. conditions 목록 제네릭만 보정함 |
| 2. 코딩 규칙 (싱글쿼트/세미콜론 없음/2스페이스) | ✅ Pass | 8개 파일 일관 |
| 3. 에러 처리 (try/catch, 빈 상태) | ✅ Pass | 전 페이지 try/catch + emptyText/빈 카드 |
| 4. 서버 컴포넌트 ('use client' 최소화) | 🟡 Partial | lots 2개만 Server Component. processes 6개 모두 client — 상호작용 페이지라 불가피하나 monitoring/analysis 일부는 서버 fetch 분리 여지 |
| 5. 컴포넌트 재사용 | ✅ Pass | PageHeader/Card/Table/Badge/Pagination/AlertBanner 활용 |
| 6. 필터 기능 | 🟡 Mixed | lots: URL searchParams 정상. processes: client state 기반 — conditions 강종검색·performance 타입/상태 필터는 service 인자까지 전달됨(정상). 단 conditions는 목록 자체가 깨져 필터 확인 불가 |
| 7. 링크 연결 | ✅ Pass | lots → lots/[id] 정상. history 행 클릭 → 타임라인(계약 정비 후 동작) |

---

## 개선 권장 사항 (우선순위 순)

1. **(Dev Team 2) `process-conditions` 백엔드 정비** — 프론트의 조건명/강종/파라미터 모델을 수용하도록 `work_standards` 스키마 확장 또는 전용 테이블 신설. GET 응답을 표준 `paginated()` 로 통일.
2. **(Dev Team 2) `lots/:id/process-timeline` 응답 계약 정비** — `{ lot_no, heat_no, steps[] }` (process_label, duration_minutes, key_parameters 포함) 형태로 반환.
3. **(Dev Team 2) `process-analysis/*` 라우터 구현** — quality-summary / cycle-time / equipment-efficiency. 구현 전 분석 페이지는 MOCK 배너 상태로 배포 보류.
4. **(QA/Dev 공통) `processes/page.tsx` 로컬 `PROCESS_TYPE_OPTS` 중복 제거** → `@/lib/constants/process` 사용.

## QA가 적용한 수정 (Edit)

- `processes/conditions/page.tsx`: 목록 응답을 `res.data.items` 로 안전 파싱, 엔드포인트 `/process-conditions` 통일, `parameters` 접근 null 가드 3곳.
- `processes/history/page.tsx`: `timeline.steps` 접근 3곳 `(timeline.steps ?? [])` 로 크래시 방어.

## 배포 판정

**조건부 보류** — Critical 3건 중 2건(conditions 쓰기 스키마, timeline 계약)은 백엔드 정비 필요. QA 측 크래시 방어는 적용되어 페이지가 죽지는 않으나, **conditions 등록/수정과 타임라인 표시는 백엔드 정비 전까지 정상 동작하지 않음**. LOT 페이지(2개)는 배포 가능.
