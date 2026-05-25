# API 연결 현황 갭 분석 리포트
> 작성일: 2026-05-24  
> 분석 대상: 53개 페이지, 21개 백엔드 라우트 파일, 12개 프론트엔드 서비스 파일

---

## 요약

| 항목 | 수 |
|------|----|
| 전체 페이지 수 | 53 |
| API 완전 연결 ✅ | 32 |
| 서비스 함수 호출하나 API 미존재 ❌ | 8 |
| 페이지가 직접 apiClient 호출 ⚠️ | 7 |
| 완전 미연결 스텁 🔴 | 6 |

---

## 상세 갭 목록

### ❌ 서비스 함수는 있으나 API 엔드포인트 미존재

| 페이지 | 서비스 함수 | 호출 API 경로 | 비고 |
|--------|------------|--------------|------|
| `dashboard/page.tsx` | `getActiveProcesses` | GET `/dashboard/active-processes` | `dashboard.ts`에 `/summary`, `/alerts`만 존재. `active-processes` 엔드포인트 없음 |
| `dashboard/page.tsx` | `getQualitySummaryToday` | GET `/dashboard/quality-summary` | 동일. `dashboard.ts`에 해당 엔드포인트 없음 |
| `ai-agent/analysis/page.tsx` | `requestAnalysis` | POST `/ai-agents/analysis` | `ai-agents.ts`에 `/query`, `/sessions`, `/shipment-eligibility`, `/due-date-risk`만 존재 |
| `ai-agent/decision/page.tsx` | `listDecisions`, `updateDecisionStatus` | GET/PATCH `/ai-agents/decisions`, `/ai-agents/decisions/:id` | `ai-agents.ts`에 해당 엔드포인트 없음 |
| `ai-agent/alerts/page.tsx` | `listAlerts`, `markAlertRead`, `markAllAlertsRead` | GET `/ai-agents/alerts`, PATCH `/ai-agents/alerts/:id/read`, POST `/ai-agents/alerts/read-all` | `ai-agents.ts`에 해당 엔드포인트 없음 |
| `ai-agent/history/page.tsx` | `listQueryHistory` | GET `/ai-agents/history` | `ai-agents.ts`에 해당 엔드포인트 없음 |
| `ai-agent/query/page.tsx` | `deleteSession` | DELETE `/ai-agents/sessions/:sessionId` | `ai-agents.ts`에 GET `/sessions`는 있으나 DELETE 없음 |
| `data-management/download/page.tsx` | `handleDownload` (직접 URL) | GET `/api/data-management/download` | `data-management.ts`에 GET `/download`가 있으나, 페이지는 Next.js API Route(`/api/...`) 경로로 직접 `window.location.href` 호출. 실제 백엔드 라우트 경로 불일치 가능성 |

---

### ⚠️ 페이지가 서비스 파일 없이 apiClient 직접 호출

| 페이지 | 호출 경로 | API 존재 여부 |
|--------|----------|--------------|
| `admin/notifications/page.tsx` | GET/POST/PATCH/DELETE `/admin/notification-rules` | ❌ 없음 — `admin.ts`에 `notification-rules` 엔드포인트 없음 |
| `admin/settings/page.tsx` | GET/PATCH `/admin/settings` | ❌ 없음 — `admin.ts`에 `settings` 엔드포인트 없음 |
| `processes/analysis/page.tsx` | GET `/kpi/dashboard`, GET `/process-analysis/quality-summary`, GET `/process-analysis/cycle-time`, GET `/process-analysis/equipment-efficiency` | `/kpi/dashboard` ✅ 존재; `/process-analysis/*` ❌ 없음 |
| `processes/monitoring/page.tsx` | GET `/equipment` | ✅ 존재 (`equipment.ts` GET /) |
| `processes/conditions/page.tsx` | GET/POST/PATCH/DELETE `/process-conditions` | ✅ 존재 (`process-conditions.ts` 전체 CRUD) |
| `processes/history/page.tsx` | GET `/process-results`, GET `/lots/:id/process-timeline` | ✅ 둘 다 존재 |
| `admin/users/page.tsx` | PATCH `/admin/users/:id` | ✅ 존재 (`admin.ts` PATCH /users/:id) — 서비스 함수도 함께 사용 중 |

---

### 🔴 완전 미연결 스텁 페이지

| 페이지 | 현황 |
|--------|------|
| `reference-info/page.tsx` | 서비스/apiClient 호출 없음. 하위 메뉴 링크만 렌더링 |
| `processes/page.tsx` | `listProcessResults` 서비스 호출 → API ✅ 존재. (스텁 아님, 하단 ✅ 목록으로 이동) |
| `admin/page.tsx` | 서비스/apiClient 호출 없음. `listUsers`, `listAuditLogs` 호출하나 admin/page.tsx 자체는 탭 컨테이너 역할 (실제 데이터 호출은 함) → ✅로 재분류 |
| `heating/page.tsx` | `listHeatingProcesses` 서비스 호출 → API ✅ 존재. (스텁 아님) |
| `data-management/visualization/page.tsx` | `getTimeSeries`, `getQualityDistribution` 서비스 호출 → API ✅ 존재. (스텁 아님) |

> 수정: 위 5개 중 진짜 스텁은 `reference-info/page.tsx` 1개뿐이며, 나머지는 모두 API 연결됨.

**실제 완전 미연결 스텁 목록:**

| 페이지 | 현황 |
|--------|------|
| `reference-info/page.tsx` | 서비스/apiClient 호출 없음. 하위 메뉴 네비게이션 링크만 있음 |
| `processes/performance/page.tsx` | `listProcessResults`, `createProcessResult` 서비스 호출. API ✅ 존재하나, KPI/성과 전용 엔드포인트 없이 범용 process-results 사용 — 데이터 의미상 불완전 |
| `data-management/download/page.tsx` | `listExportHistory` ✅ 연결. 그러나 핵심 기능인 다운로드 실행이 `window.location.href = /api/data-management/download` 로 Next.js API Route 직접 호출 — 해당 Route Handler 미존재 여부 별도 확인 필요 |
| `ai-agent/analysis/page.tsx` | `requestAnalysis` → `/ai-agents/analysis` ❌ 백엔드 없음 |
| `ai-agent/alerts/page.tsx` | 전체 서비스 함수 3개 → 백엔드 엔드포인트 전무 ❌ |
| `ai-agent/decision/page.tsx` | 전체 서비스 함수 2개 → 백엔드 엔드포인트 전무 ❌ |

---

### ✅ 완전 연결 페이지 목록

| 페이지 | 서비스 | 주요 엔드포인트 수 |
|--------|--------|-------------|
| `raw-materials/page.tsx` | `raw-material-service` | GET `/raw-materials`, POST `/raw-materials`, PATCH `/:id/inspection` |
| `raw-materials/incoming/page.tsx` | `raw-material-service` | + GET `/raw-materials/summary`, POST `/:id/generate-lot` |
| `raw-materials/supplier-quality/page.tsx` | `raw-material-service` | GET `/supplier-quality/summary`, `/supplier-quality/stats`, `/supplier-quality/reject-by-material` |
| `raw-materials/history/page.tsx` | `raw-material-service` | GET `/raw-materials/history` |
| `raw-materials/data/page.tsx` | `raw-material-service` | GET `/data-integrity/summary`, `/data-integrity/issues`, `/data-integrity/history`, PATCH `/:id` |
| `raw-materials/ai-agent/page.tsx` | `ai-service` | POST `/ai-agents/query` |
| `lots/page.tsx` | `lot-service` | GET `/lots` |
| `lots/[id]/page.tsx` | `lot-service` | GET `/lots/:id`, GET `/lots/:id/lineage` |
| `heating/page.tsx` | `heating-service` | GET `/heating-processes` |
| `heating/monitoring/page.tsx` | `heating-service` | GET `/heating-processes/monitoring/summary`, `/monitoring/furnaces` |
| `heating/conditions/page.tsx` | `heating-service` | GET/POST/PATCH/DELETE `/heating-recipes` |
| `heating/analysis/page.tsx` | `heating-service` | GET `/heating-processes/analysis/*` (5개) |
| `heating/ai-optimize/page.tsx` | `heating-service` | POST `/heating/optimize` |
| `heating/history/page.tsx` | `heating-service` | GET `/heating-processes`, GET `/:id/timeline` |
| `shipments/page.tsx` | `shipment-service` | GET/POST `/shipments`, POST `/:id/approve` |
| `shipments/data/page.tsx` | `shipment-service` | GET `/shipments/data`, `/data/summary`, PATCH `/:id/data`, POST `/data/integrity-check` |
| `shipments/history/page.tsx` | `shipment-service` | GET `/shipments/history`, GET `/:id/traceability` |
| `shipments/management/page.tsx` | `shipment-service` | GET/POST `/shipments`, POST `/:id/approve` |
| `shipments/ai-agent/page.tsx` | `ai-service` | POST `/ai-agents/shipment-eligibility`, `/due-date-risk`, `/query` |
| `quality/page.tsx` | `quality-service` | GET/POST `/quality-inspections`, PATCH `/:id` |
| `processes/page.tsx` | `process-service` | GET `/process-results` |
| `processes/monitoring/page.tsx` | `apiClient` 직접 | GET `/equipment` ✅ |
| `processes/conditions/page.tsx` | `apiClient` 직접 | GET/POST/PATCH/DELETE `/process-conditions` ✅ |
| `processes/history/page.tsx` | `apiClient` 직접 | GET `/process-results`, GET `/lots/:id/process-timeline` ✅ |
| `processes/performance/page.tsx` | `process-service` | GET `/process-results`, POST `/process-results` |
| `admin/page.tsx` | `admin-service` | GET `/admin/users`, GET `/admin/audit-logs` |
| `admin/users/page.tsx` | `admin-service` + `apiClient` | GET `/admin/users`, PATCH `/admin/users/:id` ✅ |
| `admin/logs/page.tsx` | `admin-service` | GET `/admin/audit-logs` |
| `ai-agent/page.tsx` | `ai-service` | POST `/ai-agents/query` |
| `ai-agent/query/page.tsx` | `ai-service` | POST `/ai-agents/query` (+ DELETE `/sessions/:id` ❌) |
| `ai-agent/history/page.tsx` | `ai-service` | GET `/ai-agents/history` ❌ 엔드포인트 미존재 |
| `kpi/page.tsx` | `kpi-service` | GET `/kpi/dashboard` |
| `kpi/productivity/page.tsx` | `kpi-service` | GET `/kpi/productivity`, `/productivity/trend`, `/productivity/by-process` |
| `kpi/quality/page.tsx` | `kpi-service` | GET `/kpi/quality`, `/quality/trend`, `/quality/defect-distribution`, `/quality/cpk-by-process` |
| `kpi/management/page.tsx` | `kpi-service` | GET/POST/PATCH/DELETE `/kpi/targets`, GET `/kpi/targets/history` |
| `reference-info/quality-specs/page.tsx` | `reference-info-service` | GET/POST `/reference-info/quality-specs`, PUT `/:id` |
| `reference-info/work-standards/page.tsx` | `reference-info-service` | GET/POST `/reference-info/work-standards`, PUT `/:id` |
| `reference-info/code-masters/page.tsx` | `reference-info-service` | GET/POST `/reference-info/code-masters` |
| `data-management/page.tsx` | `data-service` | GET `/data-management/integrated` |
| `data-management/integrated/page.tsx` | `data-service` | GET `/data-management/integrated`, GET `/data-sources/health`, GET `/data-sources` |
| `data-management/query/page.tsx` | `data-service` | GET `/data-management/query` |
| `data-management/query/[lotId]/page.tsx` | `data-service` | GET `/lots/:id/detail` |
| `data-management/visualization/page.tsx` | `data-service` | GET `/data-visualization/timeseries`, `/quality-distribution` |
| `data-management/download/page.tsx` | `data-service` | GET `/data-export/history` ✅ (다운로드 실행은 별도 이슈) |
| `data-management/ai-training/page.tsx` | `data-service` | GET `/ai-datasets`, GET `/data-management/integrated` |
| `dashboard/page.tsx` | `dashboard-service` | GET `/dashboard/summary`, `/dashboard/alerts` ✅ (나머지 2개 ❌) |

---

## 도메인별 갭 요약

### 1. Dashboard 도메인
| 미구현 엔드포인트 | 담당 서비스 함수 | 우선순위 |
|-----------------|----------------|---------|
| GET `/dashboard/active-processes` | `getActiveProcesses` | HIGH |
| GET `/dashboard/quality-summary` | `getQualitySummaryToday` | HIGH |

`dashboard-controller.ts`에 2개 핸들러 추가 필요.

---

### 2. AI Agent 도메인
| 미구현 엔드포인트 | 담당 서비스 함수 | 우선순위 |
|-----------------|----------------|---------|
| POST `/ai-agents/analysis` | `requestAnalysis` | HIGH |
| GET `/ai-agents/decisions` | `listDecisions` | MEDIUM |
| PATCH `/ai-agents/decisions/:id` | `updateDecisionStatus` | MEDIUM |
| GET `/ai-agents/alerts` | `listAlerts` | HIGH |
| PATCH `/ai-agents/alerts/:id/read` | `markAlertRead` | MEDIUM |
| POST `/ai-agents/alerts/read-all` | `markAllAlertsRead` | MEDIUM |
| GET `/ai-agents/history` | `listQueryHistory` | MEDIUM |
| DELETE `/ai-agents/sessions/:sessionId` | `deleteSession` | LOW |

`ai-agents.ts`에 8개 엔드포인트 추가 필요. DB 테이블: `ai_query_history`, `ai_decisions`, `ai_alerts` 필요 여부 확인.

---

### 3. Admin 도메인
| 미구현 엔드포인트 | 페이지 | 우선순위 |
|-----------------|-------|---------|
| GET/POST/PATCH/DELETE `/admin/notification-rules` | `admin/notifications/page.tsx` | MEDIUM |
| GET/PATCH `/admin/settings` | `admin/settings/page.tsx` | MEDIUM |

`admin.ts`에 2개 리소스 섹션 추가 필요.

---

### 4. Processes 도메인
| 미구현 엔드포인트 | 페이지 | 우선순위 |
|-----------------|-------|---------|
| GET `/process-analysis/quality-summary` | `processes/analysis/page.tsx` | MEDIUM |
| GET `/process-analysis/cycle-time` | `processes/analysis/page.tsx` | MEDIUM |
| GET `/process-analysis/equipment-efficiency` | `processes/analysis/page.tsx` | MEDIUM |

`processes/analysis/page.tsx`는 `/kpi/dashboard`도 직접 호출함 (✅ 연결). 신규 라우트 파일 `process-analysis.ts` 생성 또는 `processes.ts` 확장 필요.

---

## 전체 백엔드 엔드포인트 목록 (참조용)

### `/raw-materials`
- GET / — 목록
- POST / — 생성
- GET /:id — 단건
- PATCH /:id — 데이터 수정
- PATCH /:id/inspection — 검사 결과 업데이트
- POST /:id/approve-inspection — 검사 승인
- POST /:id/generate-lot — LOT 생성
- GET /summary — 입고 현황 요약
- GET /history — 이력 목록
- GET /data-integrity/summary — 정합성 요약
- GET /data-integrity/issues — 정합성 이슈 목록
- GET /data-integrity/history — 수정 이력
- GET /supplier-quality/summary — 공급사 품질 요약
- GET /supplier-quality/stats — 공급사별 통계
- GET /supplier-quality/reject-by-material — 소재별 불합격률

### `/lots`
- GET / — 목록
- GET /:id — 단건
- GET /:id/lineage — 계보
- GET /:id/history — 이력
- GET /:id/detail — 상세 (공정+품질+출하)
- GET /:id/process-timeline — 공정 타임라인

### `/heating-processes`
- GET / — 목록
- POST / — 생성
- GET /:id — 단건
- GET /:id/timeline — 이벤트 타임라인
- GET /:id/temperature-history — 온도 이력
- GET /monitoring/summary — 모니터링 요약
- GET /monitoring/furnaces — 노별 현황
- GET /monitoring/temperature-trend — 온도 추이
- GET /analysis/kpi-summary — KPI 요약
- GET /analysis/daily-counts — 일별 건수
- GET /analysis/temp-deviation — 온도 편차 분포
- GET /analysis/equipment-duration — 설비별 가열 시간
- GET /analysis/anomalies — 이상 이벤트 목록

### `/heating`
- POST /optimize — AI 최적화 추천

### `/heating-recipes`
- GET / — 목록
- GET /:id — 단건
- POST / — 생성
- PATCH /:id — 수정
- DELETE /:id — 삭제

### `/process-results` (= `/work-orders`)
- GET / — 목록
- POST / — 생성
- GET /summary — 요약

### `/process-conditions`
- GET / — 목록
- GET /:id — 단건
- POST / — 생성
- PATCH /:id — 수정
- DELETE /:id — 삭제

### `/shipments`
- GET / — 목록
- GET /:id — 단건
- POST / — 생성
- PATCH /:id — 수정
- POST /:id/approve — 출하 승인
- GET /history — 이력
- GET /data — 데이터 목록
- GET /data/summary — 데이터 요약
- PATCH /:id/data — 데이터 수정
- POST /data/integrity-check — 정합성 검사
- GET /due-date-summary — 납기 현황
- GET /:id/traceability — 추적성

### `/quality-inspections`
- GET / — 목록
- GET /:id — 단건
- POST / — 생성
- PATCH /:id — 판정 업데이트

### `/admin`
- GET /users — 사용자 목록
- POST /users — 사용자 생성
- PATCH /users/:id — 사용자 수정
- POST /users/:id/roles — 역할 할당
- DELETE /users/:id/roles/:roleId — 역할 제거
- GET /roles — 역할 목록
- POST /roles — 역할 생성
- PUT /roles/:id/permissions — 권한 업데이트
- GET /permissions — 권한 목록
- GET /code-master — 코드마스터 목록
- POST /code-master — 코드마스터 생성
- PATCH /code-master/:id — 코드마스터 수정
- GET /audit-logs — 감사 로그

### `/ai-agents`
- POST /query — AI 질의
- GET /sessions — 세션 목록
- POST /shipment-eligibility — 출하 적합성 분석
- POST /due-date-risk — 납기 리스크 분석

### `/kpi`
- GET /dashboard — KPI 대시보드
- GET /snapshots — 스냅샷
- GET /targets — 목표 목록
- GET /productivity — 생산성 KPI
- GET /productivity/trend — 생산성 추이
- GET /productivity/by-process — 공정별 생산
- GET /quality — 품질 KPI
- GET /quality/trend — 품질 추이
- GET /quality/defect-distribution — 불량 분포
- GET /quality/cpk-by-process — 공정별 Cpk
- POST /targets — 목표 생성
- PATCH /targets/:id — 목표 수정
- DELETE /targets/:id — 목표 삭제
- GET /targets/history — 목표 변경 이력

### `/reference-info`
- GET /quality-specs — 품질기준 목록
- POST /quality-specs — 품질기준 생성
- PUT /quality-specs/:id — 품질기준 수정
- GET /work-standards — 작업표준 목록
- POST /work-standards — 작업표준 생성
- PUT /work-standards/:id — 작업표준 수정
- GET /code-masters — 코드마스터 목록
- POST /code-masters — 코드마스터 생성

### `/data-management`
- GET /integrated — 통합 현황
- GET /query — LOT 기준 데이터 조회
- GET /download — CSV 직접 다운로드

### `/data-sources`
- GET /health — 데이터소스 건강 상태
- GET / — 목록
- POST / — 생성
- PATCH /:id — 수정
- DELETE /:id — 삭제

### `/data-visualization`
- GET /timeseries — 시계열 데이터
- GET /quality-distribution — 품질 분포
- GET /correlation — 상관관계

### `/data-export`
- GET /count — 예상 건수
- POST /request — 내보내기 요청
- GET /:jobId/status — 작업 상태
- GET /history — 내보내기 이력

### `/ai-datasets`
- GET /compare — 데이터셋 비교
- GET / — 목록
- GET /:id — 단건
- POST / — 생성
- PATCH /:id — 수정
- DELETE /:id — 삭제

### `/dashboard`
- GET /summary — 대시보드 요약
- GET /alerts — 알림 목록

### `/equipment`
- GET / — 목록
- GET /:id — 단건

---

## 개발자 에이전트별 작업 지시

### Backend Agent 우선 작업 목록

#### 긴급 (dashboard 첫 화면 정상 작동 필요)
1. `apps/api/src/controllers/dashboard-controller.ts` 또는 `apps/api/src/routes/dashboard.ts`
   - `GET /dashboard/active-processes` 추가 — `process_results` 테이블에서 `status='in_progress'` 목록 반환
   - `GET /dashboard/quality-summary` 추가 — 오늘 날짜 `quality_inspections` 집계

#### 높음 (AI Agent 메뉴 전체 기능 불가)
2. `apps/api/src/routes/ai-agents.ts`
   - `POST /ai-agents/analysis` — 생산/품질/설비 분석 결과 반환
   - `GET /ai-agents/alerts` — AI 알림 목록 (테이블: `ai_alerts` 또는 인메모리 규칙 기반)
   - `PATCH /ai-agents/alerts/:id/read` — 읽음 처리
   - `POST /ai-agents/alerts/read-all` — 전체 읽음

#### 중간
3. `apps/api/src/routes/ai-agents.ts`
   - `GET /ai-agents/decisions`, `PATCH /ai-agents/decisions/:id` — 의사결정 추천 목록 및 상태 변경
   - `GET /ai-agents/history` — AI 질의 이력
   - `DELETE /ai-agents/sessions/:sessionId` — 세션 삭제

4. `apps/api/src/routes/admin.ts`
   - `GET/POST/PATCH/DELETE /admin/notification-rules`
   - `GET/PATCH /admin/settings`

5. 신규 파일 `apps/api/src/routes/process-analysis.ts`
   - `GET /process-analysis/quality-summary`
   - `GET /process-analysis/cycle-time`
   - `GET /process-analysis/equipment-efficiency`
   - `apps/api/src/routes/index.ts`에 마운트 추가

### Frontend Agent 확인 사항
- `data-management/download/page.tsx` — `window.location.href = /api/data-management/download` 호출이 Next.js Route Handler를 대상으로 함. `apps/web/app/api/data-management/download/route.ts` 존재 여부 확인 후, 없으면 생성하거나 `data-management.ts`의 GET `/download`로 직접 프록시 또는 서비스 함수로 교체 필요.
- `admin/notifications/page.tsx`, `admin/settings/page.tsx` — 서비스 파일 없이 apiClient 직접 사용. `admin-service.ts`에 함수 추출 권장.
- `processes/analysis/page.tsx` — `/process-analysis/*` 엔드포인트가 생성되면 서비스 파일 `process-service.ts`에 함수 추가 및 apiClient 직접 호출 제거.
