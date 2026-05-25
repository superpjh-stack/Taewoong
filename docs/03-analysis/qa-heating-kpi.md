# QA 분석: 가열공정관리 / KPI관리

- 분석 대상: `apps/web/app/(protected)/heating/page.tsx`, `apps/web/app/(protected)/kpi/page.tsx`, `apps/api/src/routes/heating.ts`, `apps/api/src/routes/kpi.ts`, `apps/api/src/services/kpi-service.ts` (+ 연계 파일: 서비스 레이어, 컨트롤러, api-client, response, index 라우터)
- 분석일: 2026-05-21
- 분석자: QA 엔지니어
- 종합 품질 점수: 72/100

> 핵심 요약: 기존 페이지(`/heating`, `/kpi`)는 단순 조회 화면으로 큰 결함은 없으나, **신규 페이지가 사용할 서비스 함수 다수가 백엔드 라우트와 불일치**합니다. 특히 AI 최적화/모니터링/레시피/분석 엔드포인트는 현재 백엔드에 존재하지 않거나 경로가 어긋나 있어, Dev2가 신규 페이지 구현 전에 백엔드 라우트 정합부터 맞춰야 합니다.

---

## 1. 기존 코드 이슈

### Critical (즉시 수정 필요)

| 파일 | 위치 | 이슈 | 권장 조치 |
|------|------|------|-----------|
| `apps/web/lib/services/heating-service.ts` | L296 | AI 최적화 요청이 `POST /ai-agents/heating-optimize`로 전송되나, 백엔드에는 해당 라우트가 없음. 실제 핸들러는 `POST /heating/optimize`(`routes/index.ts` L25 + `heating-optimize.ts`)에 마운트됨. `/ai-agents`(`ai-agents.ts`)에는 `query`/`sessions`만 존재 → `/ai-optimize` 페이지가 항상 404 | 서비스 경로를 `/heating/optimize`로 수정하거나, 백엔드에 `/ai-agents/heating-optimize` 라우트 추가. 경로 컨벤션을 한쪽으로 통일 |
| `apps/web/lib/services/heating-service.ts` | L214-291 | 모니터링/레시피/분석 엔드포인트(`/heating-processes/monitoring/*`, `/heating-recipes`, `/heating-processes/analysis/*`)가 백엔드에 미구현. `routes/heating.ts`는 `GET /`, `GET /:id`, `POST /`만 정의 | 신규 페이지 구현 전 백엔드 라우트/컨트롤러/서비스 선행 구현 필요. 미구현 시 신규 페이지 전부 빈 화면 |
| `apps/web/lib/services/heating-service.ts` | L202-209 | `getHeatingTimeline`, `getHeatingTemperatureHistory`가 `/heating-processes/:id/timeline`, `/temperature-history` 호출하나 백엔드 미구현 → `/heating/history` 상세 타임라인 동작 불가 | 백엔드 라우트 추가 |

### Warning (개선 권장)

| 파일 | 위치 | 이슈 | 권장 조치 |
|------|------|------|-----------|
| `apps/api/src/services/kpi-service.ts` | L18-49 | KPI 대시보드가 `kpiQuerySchema`로 검증한 `params`(from/to/kpi_type)를 **완전히 무시**하고 항상 `today` 고정 기간만 집계. 기간 필터 UI가 동작하지 않음 | `params.from`/`params.to`를 쿼리에 반영하거나, 고정 기간임을 명시하고 검증 스키마를 단순화 |
| `apps/api/src/services/kpi-service.ts` | L22-25, L34-37 | `completion_rate`/`pass_rate`를 DB에서 `ROUND(...,1)`로 계산 후, 프론트(`kpi/page.tsx` L27)에서 다시 `formatPercent(value/100)`로 1자리 반올림. 이중 반올림으로 미세 오차 가능 (예: 94.95 → DB 95.0 → 표시 95.0%) | 계산은 서버 단일 책임으로, 프론트는 표시 포맷만. raw 비율(0~1)을 내려주고 프론트에서 % 변환 일원화 권장 |
| `apps/api/src/services/kpi-service.ts` | L21, L57 | `SUM(weight_kg)`이 NULL/문자열로 반환될 수 있어 `Number(... ?? 0)` 의존. postgres 드라이버가 numeric을 string으로 반환하면 정상이나, 빈 결과 시 `SUM`은 NULL → `Number(null)`=0은 OK이나 의도 명시 부족 | `COALESCE(SUM(weight_kg), 0)`로 DB 레벨 방어 |
| `apps/web/app/(protected)/kpi/page.tsx` | L27 | `unit === '%'`일 때 `value/100` 후 `formatPercent`. `value`가 이미 백분율(95.0)이므로 `/100` 처리는 맞으나, 단위 분기 로직이 데이터 형태에 강결합(magic string `'%'`) | `kpi_type` 또는 명시적 `display_format` 필드로 분기 |
| `apps/web/app/(protected)/heating/page.tsx` | L6, L24-25 | `formatDuration`을 import하나 미사용. `formatDate(String(v))`에서 `v`가 null이면 `started_at`은 NOT NULL 가정이나 방어 없음 (`completed_at`은 L25에서 방어함) | 미사용 import 제거, `started_at` null 방어 추가 |
| `apps/web/app/(protected)/heating/page.tsx` | L16-18 | `catch {}` 빈 블록으로 모든 에러를 무음 처리. API 장애와 빈 데이터가 구분 불가 → 운영 중 장애 은폐 | 최소 `console.error`/로깅, 또는 에러 상태 UI 분리 |
| `apps/web/app/(protected)/kpi/page.tsx` | L13-15 | 동일하게 빈 `catch` | 위와 동일 |
| `apps/api/src/services/kpi-service.ts` | L18, L30, L42 | 세 집계 쿼리를 순차 `await` → 직렬 실행. 독립 쿼리이므로 지연 누적 | `Promise.all`로 병렬화 |
| `apps/api/src/controllers/heating-controller.ts` | L7-8 | `page`/`limit`를 `Number()`로 직접 변환, 검증/상한 없음. `limit=999999` 또는 `limit=NaN` 주입 가능 (NaN이면 OFFSET 계산 깨짐) | zod 스키마로 page/limit 검증 및 상한(예: 100) 적용 |

### Info (참고)

- 응답 포맷은 `{ success, data, pagination? }` / `{ success, error }`로 일관 (`response.ts`). 단, 명세서의 `{ data, meta }` 표준과는 키 이름이 다름(`success` 사용) — 프로젝트 내부 일관성은 유지됨.
- 인증/인가는 라우트 레벨에서 `authenticate` + `requirePermission`으로 적용됨 (`heating.ts`, `kpi.ts`). 양호.
- SQL은 태그드 템플릿(`sql\`\``) 파라미터 바인딩 사용 → SQL Injection 방어 양호.
- `kpi-service.ts`의 `metric_key`에 한글 라벨('완료 LOT' 등)을 직접 사용. 프론트 `KpiTile`의 `label`로 그대로 노출되어 i18n/키 분리가 안 됨. 향후 다국어 시 부채.
- `heating-service.ts`(웹) L194 `res.pagination!` non-null 단언 — 백엔드가 `paginated()`를 쓰지 않는 응답을 주면 런타임 undefined 접근 위험.

---

## 2. 신규 페이지 테스트 체크리스트 (Dev2 구현 대상)

> 선행 조건: 아래 모든 페이지는 백엔드 라우트가 먼저 구현/정합되어야 함. 현재 서비스 함수만 존재하고 백엔드 핸들러는 대부분 미구현(Critical 참조).

### /heating/monitoring (실시간 모니터링)
- [ ] `getMonitoringSummary`, `listFurnaceStatuses`, `getTemperatureTrend` 백엔드 라우트 존재 및 200 응답
- [ ] 노 상태(running/idle/warning/error) 4종이 `EquipmentStatusDot`에 올바른 색으로 매핑
- [ ] `zone_temperatures[].is_over=true`일 때 경고 시각 표시
- [ ] 실시간 갱신 주기 정의(폴링 간격) — 권장 5~10초, 과도 폴링 시 부하 검증
- [ ] `elapsed_minutes`/`total_minutes` null 처리(idle 상태)
- [ ] 온도 추이 차트 X축 시간 정렬, 다중 zone/equipment 시리즈 분리
- [ ] 폴링 중 컴포넌트 언마운트 시 인터벌/요청 정리(메모리 누수)
- [ ] 네트워크 단절 시 마지막 정상값 유지 vs 에러 표시 정책 확인

### /heating/conditions (레시피/조건 관리)
- [ ] `listRecipes`/`createRecipe`/`updateRecipe`/`deleteRecipe` CRUD 정상
- [ ] `zone_temps`(Record) 입력 검증 — 음수/비현실 온도(>2000°C 등) 거부
- [ ] `heating_minutes`/`soaking_minutes` 양수 검증
- [ ] `status` active/inactive 토글 반영
- [ ] 생성 후 목록 즉시 갱신(낙관적 업데이트 또는 refetch)
- [ ] `material_grade`별 필터 동작

### /heating/history (이력)
- [ ] `listHeatingProcesses`에 `equipment_id`/`status`/`date_from`/`date_to`/`heat_no`/`search` 필터 전달·반영 (백엔드 컨트롤러는 현재 page/limit만 수신 — 필터 미구현 확인)
- [ ] 페이지네이션 total/totalPages 정확
- [ ] `getHeatingTimeline` 이벤트 4종(charged/target_reached/soaking_done/discharged) 순서·시각 정확
- [ ] `getHeatingTemperatureHistory` 차트 렌더링
- [ ] 진행 중(`completed_at=null`) 행의 완료 컬럼 '-' 표시

### /heating/analysis (분석)
- [ ] `getHeatingKpiSummary` 4지표(total_lots, avg_duration_minutes, avg_temp_deviation, anomaly_count) 표시
- [ ] `getDailyProcessCounts` 날짜 누락일 0 처리(빈 날짜 갭)
- [ ] `getTempDeviationDistribution` 버킷 `rate` 합계 ≈ 100% 검증
- [ ] `getEquipmentDurationStats` 장비별 평균 정렬
- [ ] `listAnomalyEvents` 페이지네이션 + 기간 필터
- [ ] 기간 미선택/역순(date_from > date_to) 입력 방어

### /heating/ai-optimize (AI 최적화)
- [ ] **(Critical)** `requestHeatingOptimization` 경로 정합 — 현재 `/ai-agents/heating-optimize`는 백엔드 미존재
- [ ] `HeatingOptimizeRequest` 입력 검증(weight/diameter/length/temp 양수, material_grade 필수)
- [ ] `confidence_score` 표시 — `AiConfidenceBar` 연동, 0~1 범위 검증 (MES 규약: AI 예측은 confidence 필수)
- [ ] AI 서비스 미연결(503, `AI_SERVICE_ERROR`) 시 사용자 친화 메시지
- [ ] 30초 타임아웃(`AbortSignal.timeout`) 초과 시 UI 처리
- [ ] `similar_cases` 유사도 점수 내림차순 표시
- [ ] `recommended_zone_temps`를 레시피로 저장하는 흐름 검증(있다면)

### /kpi/productivity, /kpi/quality, /kpi/management
- [ ] 각 페이지가 `kpi_type` 필터(production/quality/shipment)로 분리 조회 — 현재 `getKpiDashboard`는 전체 metrics 반환, type 분기 없음
- [ ] `from`/`to` 기간 필터가 실제 집계에 반영되는지 (현 백엔드는 today 고정 — Warning 참조)
- [ ] `target_value` 대비 달성률 시각화(완료율 95, 합격률 98, 출하지연 0)
- [ ] `target_value=null` 지표의 목표선 미표시 처리
- [ ] 단위(`%`/`건`/`kg`) 포맷 정확 (`formatPercent`/`formatNumber`)
- [ ] 데이터 0건일 때 빈 상태 메시지(division by zero → `NULLIF` 처리 확인)
- [ ] `getKpiSnapshots`(추이) 90일 제한, 날짜 내림차순 정렬

---

## 3. KPI 계산 정확성 검증 항목

| 지표 | 계산식 (kpi-service.ts) | 검증 포인트 |
|------|------------------------|-------------|
| 완료율 | `completed / NULLIF(total,0) * 100` ROUND 1 | 0건일 때 NULL → 프론트 `Number(?? 0)`=0% 정상. 100% 초과 불가 확인 |
| 검사 합격률 | `pass / NULLIF(total,0) * 100` ROUND 1 | `judgement='pass'` 외 값(보류/재검사) 분모 포함 여부 정책 확인 |
| 생산 중량 | `SUM(weight_kg) FILTER (completed)` | `COALESCE` 미적용 → 0건 시 NULL. 단위 kg 일관 |
| 출하 지연 | `due_date < CURRENT_DATE AND ship_status != 'shipped'` | 시간대(timezone) 경계 — `CURRENT_DATE`는 DB 서버 TZ 기준. 한국 운영 시 TZ=Asia/Seoul 확인 필수 |
| 기간 집계 | `DATE(created_at) = today` 고정 | **기간 필터 무시** — UI에서 기간 선택해도 today만. 의도/버그 판정 필요 |
| 이중 반올림 | DB ROUND(,1) + 프론트 formatPercent 1자리 | 경계값(x.x5) 반올림 방향 일관성 검증 |

추가 검증:
- [ ] `created_at` 기준 집계가 LOT '완료 시점'이 아닌 '생성 시점'임 — 일별 완료율 정의와 일치하는지 도메인 확인 (완료는 `completed_at` 기준이 자연스러움)
- [ ] soft delete(`deleted_at IS NULL`) 모든 집계에 일관 적용됨 (확인됨, 양호)
- [ ] TimescaleDB 시계열 KPI(`kpi_daily_snapshots`)와 실시간 집계(`getKpiDashboard`) 간 수치 정합성

---

## 4. 가열공정 실시간성 요구사항 검토

현재 `/heating` 페이지는 서버 컴포넌트 1회 fetch로 **실시간성 없음**. 신규 `/heating/monitoring`이 실시간 요구를 담당해야 함.

- [ ] 갱신 메커니즘 미정의 — 폴링(권장 초기) vs WebSocket/SSE(센서 고빈도). 현 서비스는 폴링용 GET만 제공
- [ ] TimescaleDB 센서 데이터 대상 `getTemperatureTrend(minutes)` — 고빈도 데이터 다운샘플링(time_bucket) 필요, raw 조회 시 페이로드 폭증
- [ ] 온도 초과(`is_over`) 알림의 지연 허용치(latency SLA) 정의 필요 — 안전 관련 지표면 폴링 간격 단축 또는 푸시 필요
- [ ] 다중 노 동시 모니터링 시 요청 수 = 노 개수 × 폴링 빈도. 단일 summary/furnaces 엔드포인트로 묶어 N+1 방지(현 설계는 summary/furnaces 분리되어 양호)
- [ ] 클라이언트 컴포넌트(`'use client'`) 전환 필요 — 현 페이지들은 async 서버 컴포넌트라 폴링 불가
- [ ] 백엔드 모니터링 쿼리의 N+1 위험 — `listFurnaceStatuses`가 노별 zone_temperatures를 개별 조회하지 않도록 JOIN/집계 검증

---

## 5. 개선 권고사항

1. **(Critical) 라우트 정합 우선**: 신규 페이지 착수 전, `heating-service.ts`의 모든 엔드포인트와 백엔드 라우트(`routes/heating.ts`, `index.ts`)를 1:1로 매핑하는 계약 표를 작성하고 누락 라우트를 선구현. 특히 AI 최적화 경로(`/ai-agents/heating-optimize` ↔ `/heating/optimize`) 통일.
2. **KPI 기간 필터 결정**: `getKpiDashboard`가 `params`를 무시하는 것이 버그인지 사양인지 확정. 사양이면 `kpiQuerySchema` 검증 제거, 버그면 `from`/`to` 반영. `/kpi/*` 신규 페이지의 기간 UI와 직결.
3. **계산/표시 책임 분리**: 비율은 서버에서 raw(0~1) 또는 명시 단위로 단일 계산, 프론트는 포맷 전담. 이중 반올림 제거.
4. **에러 처리 표준화**: 페이지의 빈 `catch {}`를 제거하고, 로깅 + "데이터 없음"(빈 결과)과 "API 장애"(예외)를 UI에서 구분. `ApiError`/`ErrorCode` 활용.
5. **입력 검증 강화**: heating `list` 컨트롤러의 page/limit를 zod로 검증하고 limit 상한 적용. 모니터링/분석 기간 파라미터 검증.
6. **실시간 아키텍처 결정**: monitoring 페이지의 갱신 방식(폴링 간격 또는 SSE) 및 TimescaleDB 다운샘플링 전략을 Phase 4/6 통합 시점에 확정.
7. **쿼리 병렬화**: `getKpiDashboard`의 3개 독립 집계를 `Promise.all`로 병렬화.
8. **DB 방어**: 모든 집계 SUM에 `COALESCE(...,0)` 적용, 분모는 `NULLIF` 일관 유지.

---

## 후속 조치 판정

- Critical 이슈 존재(라우트 불일치 다수) → **신규 페이지 배포 전 백엔드 라우트 정합 필수**. 기존 `/heating`·`/kpi` 조회 페이지 자체는 배포 가능하나 신규 8개 페이지는 백엔드 선행 구현 없이는 동작 불가.
