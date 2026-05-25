# QA 분석: 입고배합관리 + 기준정보관리

- 분석일: 2026-05-21
- 분석자: QA 엔지니어 (bkit-code-analyzer)
- 분석 대상:
  - `apps/web/app/(protected)/raw-materials/page.tsx` (입고배합관리 메인)
  - `apps/web/lib/services/raw-material-service.ts` (프론트 서비스 레이어)
  - `apps/api/src/routes/raw-materials.ts` (백엔드 라우트)
  - 연관: `apps/api/src/controllers/raw-material-controller.ts`, `apps/api/src/services/raw-material-service.ts`, `apps/api/src/routes/reference-info.ts`, `apps/api/src/lib/response.ts`, `apps/web/lib/api-client.ts`
- 참고: 신규 대상 페이지(`incoming`, `history`, `data`, `supplier-quality`, `ai-agent`, `quality-specs`, `work-standards`, `code-masters`)는 현재 모두 "준비 중입니다" 스텁 상태이며, Dev1이 위 API 라우트를 소비하는 형태로 구현 예정.

---

## 1. 기존 코드 이슈

### Critical (즉시 수정 필요)

| # | 파일 | 위치 | 이슈 | 권고 조치 |
|---|------|------|------|-----------|
| C1 | `apps/api/src/routes/raw-materials.ts` | 17, 57, 73, 104, 120, 147, 182, 202, 209, 216, 232 등 신규 라우트 전체 | **응답 포맷 계약 불일치.** 신규 라우트는 `{ ok: true, data }` / `{ ok: false, error: '문자열' }` 형식으로 응답하지만, 공통 헬퍼 `response.ts`와 프론트 `api-client.ts`는 `{ success: true, data }` / `{ success: false, error: { code, message } }`를 기대함. `api-client`의 `request()`는 `body.success`가 falsy면 무조건 `ApiError`를 throw → **신규 엔드포인트를 호출하는 모든 신규 페이지가 정상 응답을 에러로 처리하게 됨.** | 신규 라우트도 컨트롤러처럼 `ok()` / `paginated()` / `error()` 헬퍼를 사용하도록 통일. 인라인 SQL을 service 레이어로 이동 권장. |
| C2 | `apps/api/src/routes/reference-info.ts` | 2 | **잘못된 import로 모듈 로드 실패.** `requirePermission`을 `'../middleware/auth.js'`에서 import하지만 해당 export는 `rbac.ts`에만 존재(`auth.ts`는 `authenticate`만 export). 런타임에 `requirePermission`이 `undefined` → 라우터 등록 시 미들웨어가 함수가 아니어서 throw. **quality-specs / work-standards / code-masters 라우트 전체가 기동 불가.** | import를 `'../middleware/rbac.js'`로 수정. |
| C3 | `apps/api/src/routes/reference-info.ts` | 전체 | **인증 미적용.** raw-materials 라우터(`router.use(authenticate)`)와 달리 reference-info 라우터에는 `authenticate`가 전혀 걸려 있지 않음. `requirePermission`은 `req.user`를 읽지만 `authenticate`가 채워주지 않으면 항상 401(또는 C2로 인해 도달 불가). | 라우터 상단에 `router.use(authenticate)` 추가. |
| C4 | `apps/api/src/routes/reference-info.ts` | 27-35, 37-46, 64-79, 94-102 | **POST/PUT 입력 검증 부재.** `req.body`를 Zod 검증 없이 그대로 SQL 바인딩에 사용. 필수 필드 누락 시 DB 제약 위반 500 발생, 타입 불일치 시 비정상 데이터 삽입. (raw-material-controller는 Zod로 검증하는 것과 대비.) | 각 엔드포인트에 Zod 스키마 `safeParse` 적용 후 `VALIDATION_ERROR` 반환. |
| C5 | `apps/web/app/(protected)/raw-materials/page.tsx` ↔ service ↔ controller | page 60 / service 44-47 / response.ts 9-21 | **페이지네이션 응답 키 불일치 가능성.** 메인 페이지는 정상 컨트롤러 경로(`/raw-materials` = `ctrl.list` → `paginated()` → `{ success, data, pagination }`)를 쓰므로 동작하지만, 신규 페이지가 동일 service 패턴을 신규 라우트(`/history` 등, `ok` 포맷)에 적용하면 C1로 인해 전부 깨짐. 신규 페이지용 service는 별도 계약 검증 필요. | C1 해결 전제. 신규 service 함수는 `pagination` 존재를 `!`로 단정하지 말 것(아래 W3 참조). |

### Warning (권고)

| # | 파일 | 위치 | 이슈 | 권고 조치 |
|---|------|------|------|-----------|
| W1 | `apps/web/.../raw-materials/page.tsx` | 70 | `useEffect` 의존성 배열에 `search` 누락 + `eslint-disable exhaustive-deps`. 검색은 Enter/`load(1)` 수동 트리거이므로 의도적이나, `statusFilter` 변경 시 `setPage(1)`와 effect의 `load(page)`가 함께 동작하며 잠재적 **중복 호출** 가능(page가 이미 1이면 effect는 1회, 1이 아니면 page 변경으로 1회 — 대체로 1회지만 경합 여지). | 단일 `load(params)` 트리거로 통합하거나 `useCallback`+명시적 의존성으로 정리. AbortController로 경합 응답 취소 권장. |
| W2 | `apps/web/.../raw-materials/page.tsx` | 156, 158 | 매직 넘버 `20`(limit)을 페이지네이션 계산에 3회 하드코딩. service `load()`의 `limit: 20`과 분리되어 동기화 깨질 위험. | `const PAGE_SIZE = 20` 상수로 추출, service 호출과 표시 계산 모두 참조. |
| W3 | `apps/web/lib/services/raw-material-service.ts` | 46 | `res.pagination!` non-null 단언. 서버가 `pagination`을 안 주는 응답(예: 단일 객체)에 이 함수를 재사용하면 런타임 `undefined.total` 위험. | `res.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 0 }` 폴백 또는 타입 가드. |
| W4 | `apps/api/src/routes/raw-materials.ts` | 103, 181 | **카운트 쿼리와 목록 쿼리의 필터 불일치.** data-integrity issues(83-105)는 목록에 필터를 적용하지만 카운트(103)는 `SELECT COUNT(*) FROM raw_materials`로 전체를 셈. supplier-quality stats(159-183)도 카운트가 `suppliers` 전체. → **페이지네이션 totalPages 과다 계산**으로 빈 페이지 노출. | 카운트 쿼리에도 동일 WHERE 절 적용. |
| W5 | `apps/api/src/routes/raw-materials.ts` | 99 | data-integrity `error_type` 필터가 특정 타입 선택과 무관하게 "전체 에러 조건"으로만 필터(타입별 분기 없음). UI에서 `missing_field` 선택해도 `invalid_weight` 행이 섞여 나옴. | `error_type` 값에 따라 개별 WHERE 분기. |
| W6 | `apps/api/src/routes/raw-materials.ts` | 32, 87, 162 | `SELECT rm.*` 와일드카드 사용. `deleted_at IS NULL` 소프트삭제 필터가 신규 라우트(history/issues/supplier-quality)에 **누락** — 컨트롤러 service는 적용하지만 인라인 라우트는 미적용. 삭제된 행이 목록/통계에 포함됨. | 신규 쿼리에 `AND rm.deleted_at IS NULL` 추가, 명시적 컬럼 선택. |
| W7 | `apps/api/src/routes/raw-materials.ts` | 220-233 | PATCH 라우트(`/:id`)가 컨트롤러 우회 + Zod 미검증. `material_type` 등에 임의 타입 허용. C4와 동일 패턴. | Zod 검증 추가 또는 컨트롤러 경유. |
| W8 | `apps/web/lib/services/raw-material-service.ts` | 45 | `toQueryString(params as Record<string, unknown>)` 캐스팅. `RawMaterialFilter`에 `material_lot_no`는 있으나 신규 페이지가 쓸 `lot_no`, `heat_no`, `date_from/to`, `material_type` 필드는 인터페이스에 없음 → 신규 페이지에서 타입 안전성 상실. | 신규 필터 필드를 타입에 추가하거나 페이지별 필터 타입 분리. |
| W9 | `apps/api/.../raw-material-service.ts` (백엔드) | 19-20, 30-31 | 필터 키 불일치: 백엔드 service는 `from`/`to`를 받지만 프론트 service는 (현재) 미사용, 신규 라우트는 `date_from`/`date_to` 사용. **3곳의 날짜 파라미터 명명이 제각각**(`from/to` vs `date_from/date_to`). | 단일 명명 규약(`date_from`/`date_to` 권장)으로 통일. |

### Info (참고)

- **SQL 인젝션:** 양호. 모든 쿼리가 `postgres`/`sql` 태그드 템플릿 파라미터 바인딩 사용. 사용자 입력이 문자열 보간으로 직접 들어가는 곳 없음(ILIKE의 `'%' + String(x) + '%'`도 바인딩 값으로 전달됨).
- **XSS:** 양호. React JSX 자동 이스케이프, `dangerouslySetInnerHTML` 미사용.
- **타입 안전성(프론트):** `RawMaterial`에 `[key: string]: unknown` 인덱스 시그니처가 있어 임의 필드 접근이 타입 체크를 우회함. 편의상 허용된 것으로 보이나 신규 필드 오타를 잡지 못함.
- **에러 처리(프론트 메인):** 양호. `ApiError instanceof` 분기 + 한국어 폴백 메시지, 로딩/빈 상태 처리됨.
- **인증/인가:** raw-materials는 `incoming:read`/`incoming:write` 권한으로 적절히 보호. (reference-info는 C2/C3로 깨져 있음.)
- **localStorage 토큰:** `api-client`가 JWT를 `localStorage`에 저장 — XSS 발생 시 토큰 탈취 위험(Phase 7 보안 검토 항목). 현 단계 수용 가능하나 향후 httpOnly 쿠키 전환 검토.
- **N+1:** 없음. JOIN으로 supplier_name 등 해결.
- **함수/파일 길이:** 모두 권고 범위 내. 단, 라우트 파일에 인라인 SQL이 많아 service 레이어 분리 시 가독성·재사용성 개선 여지.

---

## 2. 신규 페이지 테스트 체크리스트

> 공통 선행 조건: **C1(응답 포맷) 해결 전에는 아래 모든 데이터 연동 항목이 실패함.** Dev1 구현 시 신규 라우트 응답을 `success` 포맷으로 정렬했는지 먼저 확인.

### 공통 (모든 페이지 적용)
- [ ] 페이지 진입 시 로딩 스피너/스켈레톤 표시
- [ ] 데이터 0건일 때 빈 상태(emptyText) 표시
- [ ] API 4xx/5xx 시 `AlertBanner` 에러 표시 + 한국어 메시지
- [ ] 401(미인증) 시 로그인 리다이렉트 동작
- [ ] 403(권한 없음) 시 권한 안내 메시지
- [ ] 페이지네이션 totalPages 정확성(W4 회귀 확인)
- [ ] 검색/필터 변경 시 page 1로 리셋
- [ ] 키보드 포커스 이동 및 `aria-label`/`aria-live`(에러 배너) 부여
- [ ] 모바일/좁은 화면 레이아웃 깨짐 없음

### /raw-materials/incoming (`GET /raw-materials/summary`, `POST /raw-materials`)
- [ ] 요약 카드(금일 입고/검사 대기/금일 반려) 수치 로딩 성공
- [ ] summary API 응답 키(`today_count`, `pending_count`, `rejected_today`) 매핑 정확
- [ ] 입고 등록 모달 폼 검증(필수: supplier_id, material_type, weight_kg, received_at)
- [ ] 등록 성공 시 모달 닫힘 + 목록/요약 갱신
- [ ] 등록 실패(검증 오류) 시 모달 내 에러 표시
- [ ] 빈 상태 / 에러 상태 표시

### /raw-materials/history (`GET /raw-materials/history`)
- [ ] 목록 로딩 성공(lot_no, heat_no, material_type, supplier, lot_status 컬럼)
- [ ] 검색 필터 동작: lot_no, heat_no, material_type, supplier_id, date_from, date_to
- [ ] **필터 적용 시 페이지네이션 total이 필터 결과와 일치**(W4 회귀)
- [ ] 소프트삭제된 행 미노출(W6 회귀)
- [ ] 날짜 범위 역순 입력(from > to) 방어
- [ ] 빈 상태 / 에러 상태 표시

### /raw-materials/data (`GET /raw-materials/data-integrity/{summary,issues,history}`, `PATCH /raw-materials/:id`)
- [ ] 무결성 요약 카드(total/error/pending_fix) 로딩
- [ ] 이슈 목록의 `error_type` 배지 표시(missing_field/invalid_weight/invalid_date)
- [ ] **error_type 필터 선택 시 해당 타입만 노출**(W5 회귀)
- [ ] **이슈 목록 페이지네이션 total이 필터 결과와 일치**(W4 회귀)
- [ ] 데이터 수정(PATCH) 폼 검증 및 부분 업데이트 동작(COALESCE)
- [ ] 수정 후 목록/요약 갱신 + 수정 이력(history)에 audit_log 반영
- [ ] 잘못된 입력(PATCH) 시 검증 에러 표시(W7 회귀)
- [ ] 빈 상태 / 에러 상태 표시

### /raw-materials/supplier-quality (`GET /raw-materials/supplier-quality/{summary,stats,reject-by-material}`)
- [ ] 요약(공급사 수/평균 합격률/최고·최저 공급사) 로딩
- [ ] 공급사별 통계 테이블(pass_rate, avg_weight_kg) 정렬·표시
- [ ] **stats 페이지네이션 total이 실제 통계 행 수와 일치**(W4 회귀: 현재 suppliers 전체 카운트)
- [ ] 소재별 반려율 차트/표 로딩
- [ ] 날짜 필터(date_from/date_to) 동작 및 통계 재계산
- [ ] 합격률 계산 시 분모 0(NULLIF) 방어 → 0% 또는 "-" 표시
- [ ] 빈 상태(통계 없음) / 에러 상태 표시

### /raw-materials/ai-agent
- [ ] AI 응답 로딩 상태(스트리밍/대기) 표시
- [ ] AI 예측 결과에 **confidence score 필드 표시**(CLAUDE.md 도메인 규칙)
- [ ] AI 서비스 오류(`AI_SERVICE_ERROR`) 시 사용자 안내 + 재시도
- [ ] 타임아웃/장시간 응답 처리
- [ ] 빈 상태(질의 전) / 에러 상태 표시
- [ ] (해당 API 라우트 미존재 — 백엔드 엔드포인트 정의 선행 필요)

### /reference-info/quality-specs (`GET/POST/PUT /reference-info/quality-specs`)
- [ ] **라우트 기동 확인**(C2/C3 수정 후 401/500 아닌 200)
- [ ] 목록 로딩 + inspection_type / is_active 필터 동작
- [ ] 등록(POST) 필수 필드 검증(spec_code, material_type, inspection_type, criteria)(C4 회귀)
- [ ] 수정(PUT) 동작 및 version 증가 처리
- [ ] is_active 토글(활성/비활성) 표시
- [ ] 중복 spec_code 등록 시 CONFLICT 처리
- [ ] 빈 상태 / 에러 상태 표시

### /reference-info/work-standards (`GET/POST/PUT /reference-info/work-standards`)
- [ ] 라우트 기동 확인(C2/C3 회귀)
- [ ] 목록 로딩 + process_type / is_active 필터 동작
- [ ] **목록 카운트 쿼리가 is_active 필터를 무시함**(라우트 58-60: count에 is_active 누락) → total 불일치 확인
- [ ] 등록(POST) 필수 필드 검증(standard_code, process_type, title)(C4 회귀)
- [ ] 수정(PUT) 동작
- [ ] 첨부파일 URL 처리(있을 경우)
- [ ] 빈 상태 / 에러 상태 표시

### /reference-info/code-masters (`GET/POST /reference-info/code-masters`)
- [ ] 라우트 기동 확인(C2/C3 회귀)
- [ ] 카테고리별 코드 목록 로딩 + category / is_active 필터
- [ ] `categories` 목록(distinct) 응답 매핑 및 카테고리 선택 UI
- [ ] 등록(POST) 필수 필드 검증(category, code, name)(C4 회귀)
- [ ] sort_order 정렬 표시
- [ ] 동일 category+code 중복 등록 방어
- [ ] (PUT/삭제 라우트 미존재 — 수정/비활성 기능 필요 시 백엔드 추가 선행)
- [ ] 빈 상태 / 에러 상태 표시

---

## 3. API 계약 검증

### 요청/응답 타입 일치 여부
| 항목 | 기대(공통 표준) | 실제(신규 라우트) | 판정 |
|------|-----------------|-------------------|------|
| 성공 응답 래퍼 | `{ success: true, data }` | `{ ok: true, data }` | ❌ 불일치 (C1) |
| 에러 응답 | `{ success: false, error: { code, message } }` | `{ ok: false, error: '문자열' }` | ❌ 불일치 (C1) |
| 페이지네이션 | `pagination: { total, page, limit, totalPages }` | `pagination: { page, limit, total }` (totalPages 누락) | ⚠️ 부분 (프론트가 `Math.ceil`로 자체 계산하면 동작하나 표준과 다름) |
| 프론트 `ApiResponse<T>` | `success` 기반 | `api-client`는 `success` 필수 | ❌ 신규 라우트 응답을 항상 에러 처리 |

### 필수 필드 누락 여부
- 신규 POST/PUT 라우트(reference-info, raw-materials PATCH): **서버측 입력 검증 누락**(C4/W7). 필수 필드 미입력 시 DB 레벨 500 노출, 클라이언트 친화 메시지 없음.
- `error_type`, `is_active` 등 일부 카운트 쿼리에서 필터 누락(W4) → 메타데이터(total) 부정확.
- 프론트 `RawMaterialFilter` 타입에 신규 페이지가 사용할 필터 필드 누락(W8).
- 날짜 파라미터 명명 불일치: `from/to`(백엔드 service) vs `date_from/date_to`(신규 라우트)(W9).

---

## 4. 개선 권고사항

1. **[Critical 최우선] 응답 포맷 통일 (C1).** 신규 라우트의 인라인 핸들러를 `response.ts`의 `ok()`/`paginated()`/`error()` 헬퍼로 전면 교체. `ok`→`success` 정렬 없이는 신규 8개 페이지 중 데이터 연동 페이지가 모두 동작 불가.
2. **[Critical] reference-info 라우터 수정 (C2/C3).** import 경로를 `rbac.js`로 교정하고 `router.use(authenticate)` 추가. 수정 전에는 quality-specs/work-standards/code-masters 전체 기동 불가.
3. **[Critical] 입력 검증 일괄 적용 (C4/W7).** raw-material-controller처럼 모든 신규 POST/PUT/PATCH에 Zod 스키마 `safeParse` → `VALIDATION_ERROR`. 공유 `@taewung/types/zod`에 reference-info용 스키마 추가 권장.
4. **[Warning] 카운트/목록 필터 동기화 (W4/W5).** 페이지네이션 카운트 쿼리에 목록과 동일한 WHERE 절을 강제. 현재 빈 페이지·총건수 오류 유발.
5. **[Warning] 소프트삭제 필터 일관성 (W6).** 신규 인라인 쿼리에 `deleted_at IS NULL` 추가. 인라인 SQL을 백엔드 service 레이어로 이전하면 컨트롤러 경로와 동일 정책을 자동 상속.
6. **[Warning] 프론트 타입/상수 정리 (W2/W3/W8).** `PAGE_SIZE` 상수화, `pagination` 폴백, 신규 필터 필드 타입 보강. `RawMaterial`의 `[key: string]: unknown` 인덱스 시그니처는 명시 필드로 축소 검토.
7. **[Info] 날짜 파라미터 규약 통일 (W9).** `date_from`/`date_to`로 3개 레이어(프론트 service / 백엔드 service / 라우트) 정렬.
8. **[Info] AI Agent 백엔드 부재.** `/raw-materials/ai-agent` 페이지는 대응 API 라우트가 없음. 구현 전 엔드포인트 계약(요청/응답, **confidence score 필수**, `AI_SERVICE_ERROR` 처리)을 먼저 정의.
9. **[Info] 회귀 테스트 추가.** C1 재발 방지를 위해 신규 라우트 응답 스키마(`success`/`pagination` 키) 계약 테스트 작성 권장. 필터-카운트 일치(W4) 통합 테스트 포함.

---

## 종합 판정

- **품질 점수: 62/100** (메인 페이지·컨트롤러·service 레이어는 견고하나, 신규 라우트의 응답 계약 불일치·검증 누락·reference-info 기동 불가가 점수를 크게 깎음)
- **배포 판정: 차단(BLOCKED).** Critical C1~C4 미해결 상태에서는 신규 페이지 연동이 불가능. C1~C4 수정 후 재분석(목표 ≥90%) 필요.
