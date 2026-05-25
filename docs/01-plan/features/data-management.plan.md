# [Plan] 데이터관리 (data-management)

> **Summary**: IoT·공정 데이터 통합 저장소 구축, LOT 기준 조회·시각화·다운로드, AI 학습 데이터셋 관리
>
> **Author**: Product Manager Agent
> **Created**: 2026-05-21
> **Last Modified**: 2026-05-21
> **Status**: Draft

---

## 1. 개요

### 배경 및 목적

㈜태웅 AI-MES는 입고→가열→단조→열처리→검사→출하에 이르는 전 공정에서 IoT 센서 데이터, 공정 실적 데이터, 품질 검사 데이터가 분산 생성된다. 현재 이 데이터들은 `lots`, `process_results`, `quality_inspections`, `shipments`, `raw_materials`, `heating_processes`, `sensor_data`, `kpi_daily_snapshots` 테이블에 각각 저장되어 있으나, 단일 인터페이스로 통합 조회·분석·활용하는 체계가 없다.

데이터관리 모듈은 다음 세 가지 목적을 달성한다.

1. **단일 데이터 접근점 제공** — 분산 테이블의 데이터를 Heat No./LOT 기준으로 통합 조회
2. **운영자·관리자의 데이터 활용 지원** — 시각화·다운로드를 통한 의사결정 지원
3. **AI 모델 품질 유지** — 학습 데이터셋 버전 관리 및 품질 검증 체계 수립

### 모듈 위치

사업계획서 기능구조도 p.40-43, 최상위 메뉴 **M8: 데이터관리** 하위 5개 기능.

---

## 2. 사용자 스토리

### US-01: 데이터통합관리 (운영 관리자)

> 운영 관리자로서, IoT 및 공정 데이터 수집 규칙을 등록·수정·삭제하고 데이터 정합성 상태를 모니터링하고 싶다. 그래야 AI 분석의 입력 품질을 보장할 수 있기 때문이다.

**수락 기준**:
- 데이터 소스(테이블/센서 채널) 등록·수정·삭제 가능
- 각 소스별 수집 상태(정상/지연/오류) 실시간 조회
- 데이터 누락 구간 감지 시 알림 표시

### US-02: 데이터조회 (생산 담당자 / 품질 담당자)

> 생산 담당자로서, LOT 번호를 입력하면 해당 LOT의 공정·품질·출하 데이터를 한 화면에서 조회하고 싶다. 이력 추적과 불량 원인 분석에 필요하기 때문이다.

**수락 기준**:
- LOT 번호 또는 Heat No. 입력으로 전 공정 이력 조회
- 공정-품질-출하 데이터 연계 표시 (탭 또는 섹션 구조)
- 조회 결과 50건 이상 시 페이지네이션 적용
- 권한 없는 데이터 필드는 마스킹 처리

### US-03: 데이터시각화 (경영진 / 공정 엔지니어)

> 공정 엔지니어로서, 가열 온도·단조 하중 등 센서 데이터의 시간별 트렌드를 그래프로 확인하고 싶다. 공정 이상 징후를 조기에 발견하기 위해서다.

**수락 기준**:
- 시계열 꺾은선 그래프, 산점도, 히스토그램 등 기본 차트 유형 지원
- 조회 기간 필터(일/주/월/사용자 지정) 적용
- 단일 화면에서 복수 지표 오버레이(중첩) 비교 가능
- 차트 데이터 포인트 hover 시 상세 수치 표시

### US-04: 데이터 다운로드 (생산 관리자 / 외부 보고 담당)

> 생산 관리자로서, 특정 기간·공정·LOT 조건으로 조회한 데이터를 Excel 파일로 다운로드하고 싶다. 고객사 납품 보고서 및 내부 분석에 활용하기 위해서다.

**수락 기준**:
- 조회 조건과 동일한 필터로 Excel(.xlsx) 다운로드
- 다운로드 파일에 조회 조건, 생성 일시, 사용자 정보 포함
- 다운로드 이력 감사 로그 기록
- 10,000행 초과 시 비동기 처리 후 알림(이메일 또는 UI 배지)

### US-05: AI학습 데이터관리 (AI 엔지니어 / 데이터 관리자)

> AI 엔지니어로서, ML 모델 학습에 사용할 데이터셋을 버전별로 등록·관리하고 품질 지표를 확인하고 싶다. 모델 재학습 시 데이터 이력을 추적하고 성능 저하 원인을 파악하기 위해서다.

**수락 기준**:
- 데이터셋 등록 시 이름, 버전, 대상 모델, 설명 필드 입력
- 데이터셋 품질 지표(결측률, 이상치 비율, 샘플 수) 자동 계산 및 표시
- 버전 간 비교 뷰 제공
- 학습에 사용된 데이터셋-모델 버전 매핑 이력 조회

---

## 3. 기능 요구사항

### FR-01: 데이터통합관리

**설명**: 분산 데이터 소스를 단일 저장소 기준으로 통합 관리하는 CRUD 기능

**페이지 경로**: `/data-management/integration`

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/data-sources` | 데이터 소스 목록 조회 (페이지네이션) |
| POST | `/api/data-sources` | 데이터 소스 등록 |
| PUT | `/api/data-sources/:id` | 데이터 소스 수정 |
| DELETE | `/api/data-sources/:id` | 데이터 소스 삭제 (soft delete) |
| GET | `/api/data-sources/:id/status` | 소스별 수집 상태 조회 |
| GET | `/api/data-sources/health` | 전체 데이터 정합성 상태 요약 |

**주요 시나리오**:
1. 관리자가 신규 센서 채널(예: 가열로 4존 열전대)을 데이터 소스로 등록
2. 수집 지연 또는 누락 구간 발생 시 상태 패널에 경고 표시
3. 더 이상 사용하지 않는 소스를 삭제(soft delete)하여 이력 보존

**우선순위**: Must

**관련 테이블**: `data_sources`(신규), `sensor_data`, `process_results`

---

### FR-02: 데이터조회

**설명**: LOT/Heat No. 기준 전 공정 데이터 통합 조회 (읽기 전용)

**페이지 경로**: `/data-management/query`

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/data-query/lots` | LOT 목록 조회 (필터: 기간, 공정, 상태) |
| GET | `/api/data-query/lots/:lotId` | LOT 상세 — 전 공정 연계 데이터 |
| GET | `/api/data-query/lots/:lotId/process` | LOT의 공정 이력 |
| GET | `/api/data-query/lots/:lotId/quality` | LOT의 품질 검사 결과 |
| GET | `/api/data-query/lots/:lotId/shipment` | LOT의 출하 정보 |
| GET | `/api/data-query/search` | 복합 조건 검색 (Heat No., 소재, 규격, 고객사) |

**주요 시나리오**:
1. 품질 클레임 접수 시 LOT 번호로 전 공정 추적 — 원인 공정·작업자 특정
2. 특정 Heat No.의 단조 하중·가열 온도·검사 결과를 한 화면에서 비교
3. 복합 조건(기간 + 고객사 + 공정 상태)으로 대상 LOT 필터링

**우선순위**: Must

**관련 테이블**: `lots`, `process_results`, `quality_inspections`, `shipments`, `heating_processes`, `raw_materials`

---

### FR-03: 데이터시각화

**설명**: 공정·품질·센서 데이터의 트렌드 시각화 대시보드 (읽기 전용)

**페이지 경로**: `/data-management/visualization`

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/data-viz/timeseries` | 시계열 센서 데이터 (쿼리: metric, start, end, interval) |
| GET | `/api/data-viz/process-trend` | 공정 파라미터 트렌드 |
| GET | `/api/data-viz/quality-distribution` | 품질 지표 분포 (히스토그램용) |
| GET | `/api/data-viz/kpi-summary` | KPI 요약 지표 (OEE, 불량률, 재가열률) |
| GET | `/api/data-viz/correlation` | 공정 파라미터-품질 상관 분석 데이터 |

**차트 유형**:
- 시계열 꺾은선 그래프 (가열 온도, 단조 하중, 센서값)
- 막대 그래프 (LOT별 생산량, 불량 건수)
- 히스토그램 (품질 수치 분포)
- 산점도 (공정-품질 상관관계)

**주요 시나리오**:
1. 가열로 4존(예열/가열1/가열2/균열) 온도 추이를 동일 차트에 오버레이 비교
2. 월별 불량률 추이를 막대 그래프로 확인, 목표선(≤3%) 표시
3. 단조 하중 vs 검사 합격 여부 산점도로 공정-품질 상관관계 분석

**우선순위**: Should

**관련 테이블**: `sensor_data`(TimescaleDB), `kpi_daily_snapshots`, `quality_inspections`, `process_results`

---

### FR-04: 데이터 다운로드

**설명**: 조회 결과를 Excel 파일로 내보내는 기능 (읽기/다운로드)

**페이지 경로**: `/data-management/download` (또는 조회 화면 내 다운로드 버튼)

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/data-export/request` | 다운로드 작업 요청 (조건 포함) |
| GET | `/api/data-export/:jobId/status` | 비동기 작업 상태 조회 |
| GET | `/api/data-export/:jobId/download` | 완료된 파일 다운로드 |
| GET | `/api/data-export/history` | 다운로드 이력 조회 (감사용) |

**파일 규격**:
- 포맷: `.xlsx` (Excel 2007+)
- 파일명: `taewung_data_{조건요약}_{YYYYMMDD_HHmmss}.xlsx`
- 헤더 시트: 조회 조건, 생성 일시, 요청자, 총 건수
- 데이터 시트: 조회 결과 (컬럼 헤더 한글 표기)

**주요 시나리오**:
1. LOT 조회 결과 500건을 즉시 다운로드 → 동기 처리
2. 센서 데이터 50,000건 다운로드 요청 → 비동기 처리, 완료 시 UI 배지 알림
3. 다운로드 이력에서 누가 어떤 조건으로 데이터를 내보냈는지 감사 확인

**우선순위**: Should

**관련 테이블**: 조회 조건에 따라 동적, `data_export_logs`(신규 감사 테이블)

---

### FR-05: AI학습 데이터관리

**설명**: ML 모델 학습용 데이터셋 버전 관리 및 품질 검증 CRUD 기능

**페이지 경로**: `/data-management/ai-training`

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/ai-datasets` | 데이터셋 목록 조회 |
| POST | `/api/ai-datasets` | 데이터셋 신규 등록 |
| GET | `/api/ai-datasets/:id` | 데이터셋 상세 (품질 지표 포함) |
| PUT | `/api/ai-datasets/:id` | 데이터셋 메타정보 수정 |
| DELETE | `/api/ai-datasets/:id` | 데이터셋 삭제 (soft delete, 학습 이력 있으면 비활성화만) |
| GET | `/api/ai-datasets/:id/quality` | 품질 지표 재계산 요청 |
| GET | `/api/ai-datasets/compare` | 버전 간 비교 (쿼리: v1, v2) |
| GET | `/api/ai-datasets/:id/model-history` | 해당 데이터셋으로 학습된 모델 이력 |

**데이터셋 메타정보 필드**:
- `name`: 데이터셋 이름
- `version`: 버전 (SemVer, 예: 1.2.0)
- `target_model`: 대상 AI 모델 (예: heating-optimizer, defect-detector)
- `sample_count`: 샘플 수
- `missing_rate`: 결측률 (%)
- `outlier_rate`: 이상치 비율 (%)
- `date_range_start` / `date_range_end`: 데이터 기간
- `description`: 설명 및 변경 사항
- `created_by`: 등록자
- `status`: active / deprecated / in-review

**주요 시나리오**:
1. 신규 학습 데이터셋(v2.0.0) 등록 → 품질 지표 자동 계산 → 엔지니어 검토 후 active 전환
2. v1.x와 v2.0 데이터셋 품질 지표 비교 → 개선 여부 확인
3. 특정 모델 버전이 어떤 데이터셋으로 학습되었는지 역추적

**우선순위**: Could

**관련 테이블**: `ai_datasets`(신규), `ai_model_training_history`(신규)

---

## 4. 비기능 요구사항

### NFR-01: 성능

| 항목 | 요구 기준 |
|------|-----------|
| LOT 상세 조회 응답 시간 | ≤ 1초 (단일 LOT 기준) |
| 시계열 차트 데이터 로딩 | ≤ 2초 (1개월치 1분 간격 데이터) |
| 동기 다운로드 처리 시간 | ≤ 5초 (10,000행 이하) |
| 비동기 다운로드 처리 시간 | ≤ 3분 (100,000행 이하) |
| 데이터 소스 상태 갱신 주기 | 30초 이하 (실시간 폴링 또는 SSE) |

### NFR-02: 보안 및 접근제어

- 모든 API는 JWT 인증 필수 (`authenticate` 미들웨어)
- 역할 기반 접근 제어(RBAC) 적용:
  - `OPERATOR`: FR-02(조회), FR-03(시각화), FR-04(다운로드) 읽기
  - `MANAGER`: 위 + FR-01(통합관리) 쓰기, FR-04 다운로드
  - `AI_ENGINEER`: 위 + FR-05(AI학습데이터) CRUD
  - `ADMIN`: 전체 권한
- 다운로드 기능은 반드시 감사 로그 기록
- 개인정보에 해당하는 필드 마스킹 처리 (작업자 개인정보 등)

### NFR-03: 데이터 보존

- 다운로드 감사 로그: 3년 보존 (기준정보 정책 동일)
- AI 데이터셋 메타정보: 소프트 딜리트, 학습 이력 있으면 영구 보존
- TimescaleDB 센서 데이터: 2년 보존 (자동 파티션 삭제)

### NFR-04: 가용성 및 에러 처리

- 데이터 소스 장애 시 해당 소스만 오류 표시, 타 기능은 정상 동작
- 비동기 다운로드 실패 시 재시도 1회 후 실패 알림
- API 오류 응답은 `{ code, message, details }` 표준 형식

---

## 5. 구현 범위

### In Scope (이번 이터레이션)

| 기능 | 우선순위 | 비고 |
|------|----------|------|
| FR-01 데이터통합관리 CRUD | Must | 데이터 소스 등록·상태 모니터링 |
| FR-02 데이터조회 (LOT 기준) | Must | 전 공정 연계 조회 핵심 기능 |
| FR-03 데이터시각화 (기본 차트) | Should | 시계열·분포 차트 우선 |
| FR-04 데이터 다운로드 (Excel) | Should | 동기/비동기 분기 처리 포함 |
| FR-05 AI학습 데이터관리 | Could | 데이터셋 CRUD + 품질 지표 |

### Out of Scope (이번 이터레이션 제외)

- 실시간 스트리밍 대시보드 (Kafka/WebSocket 연동) → 별도 이터레이션
- 데이터 파이프라인 오케스트레이션 (Airflow 등) → 인프라 단계
- BI 툴 연동 (Tableau, Power BI) → 추후 검토
- 데이터 익명화·마스킹 자동화 파이프라인 → 보안 모듈로 분리
- PDF 다운로드 → v2 검토

### 신규 DB 테이블 (필요)

| 테이블명 | 목적 |
|----------|------|
| `data_sources` | 데이터 소스 등록 정보 |
| `data_export_logs` | 다운로드 감사 로그 |
| `ai_datasets` | AI 학습 데이터셋 메타정보 |
| `ai_model_training_history` | 데이터셋-모델 학습 이력 매핑 |

---

## 6. 의존성

### 내부 의존성 (기존 구현 기반)

| 의존 모듈 | 이유 |
|-----------|------|
| Phase 1 DB 스키마 | `lots`, `process_results`, `quality_inspections`, `shipments`, `heating_processes`, `sensor_data`, `kpi_daily_snapshots` 테이블 사용 |
| Phase 4 API (`/lots`, `/quality`, `/shipments`) | FR-02 조회 API가 기존 엔드포인트 재활용 또는 확장 |
| RBAC 미들웨어 | 역할별 접근 제어 적용 필수 |
| `lib/response.ts` 헬퍼 | 표준 API 응답 형식 |

### 외부 라이브러리 (신규 필요)

| 라이브러리 | 용도 | 우선순위 |
|-----------|------|----------|
| `exceljs` | Excel(.xlsx) 파일 생성 (FR-04) | Should |
| `recharts` 또는 `chart.js` | 프론트엔드 차트 컴포넌트 (FR-03) | Should |
| TimescaleDB `time_bucket()` | 시계열 집계 쿼리 (FR-03) | Should |
| Bull / BullMQ | 비동기 다운로드 작업 큐 (FR-04) | Should |

### 인프라 의존성

- PostgreSQL 16 + TimescaleDB: `sensor_data` 시계열 집계 쿼리
- Redis 7: BullMQ 작업 큐 (비동기 다운로드)

---

## 7. 성공 지표

| 지표 | 목표값 | 측정 방법 |
|------|--------|-----------|
| LOT 상세 조회 응답 시간 | ≤ 1초 | API 성능 테스트 |
| 시각화 차트 로딩 시간 | ≤ 2초 | 프론트엔드 성능 측정 |
| 다운로드 기능 감사 로그 기록률 | 100% | DB 로그 검증 |
| AI 데이터셋 품질 지표 자동 계산 | 등록 후 30초 이내 | 기능 테스트 |
| 권한 없는 API 접근 차단 | 100% | 보안 테스트 |

---

## 관련 문서

- Plan (전체 모듈): `docs/01-plan/03-PM-process-data-ai-kpi.md`
- Design (예정): `docs/02-design/features/data-management.design.md`
- Phase 4 API Plan: `docs/01-plan/features/phase-4-api.plan.md`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-05-21 | Initial draft — 5개 FR, MoSCoW 우선순위 적용 | PM Agent |
