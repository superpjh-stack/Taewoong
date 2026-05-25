# [Plan] 가열공정관리 하위메뉴 (heating-submenus)

> **Summary**: 가열로 존별 실시간 모니터링, 강종별 가열 레시피 관리, Heat No. 기준 공정이력 조회, 공정효율 분석, ML 기반 최적 가열조건 예측 5개 하위메뉴
>
> **Author**: Product Manager Agent
> **Created**: 2026-05-21
> **Last Modified**: 2026-05-21
> **Status**: Draft

---

## 1. 개요

### 배경 및 목적

㈜태웅 AI-MES 가열공정관리 모듈(M3)은 단조 전 원료 가열 단계를 다룬다. 가열 온도·체류시간·에너지 소비는 단조 품질과 직결되며, 재가열(재작업)은 에너지 손실과 생산 지연의 주요 원인이다.

5개 하위메뉴는 다음 목적을 달성한다.

1. **가열공정 데이터 모니터링** — 가열로 4존(예열/가열1/가열2/균열) 실시간 상태 가시화
2. **작업조건관리** — 강종·제품 규격별 표준 가열 레시피 등록 및 변경 이력 관리
3. **공정이력조회** — Heat No. 기준 가열~단조~열처리 공정 간 품질 연계 이력 추적
4. **공정데이터분석** — 가열 파라미터 기반 공정 효율 분석 및 재가열 원인 도출
5. **가열 최적화 AI 분석** — ML 모델 기반 최적 가열조건 예측 및 과열/미열/재가열 사전 예방

### 모듈 위치

사업계획서 기능구조도 p.41-42, 최상위 메뉴 **M3: 가열공정관리** 하위 5개 기능.

### 가열로 존 정의

| 존 | 명칭 | 역할 |
|----|------|------|
| Zone 1 | 예열대 | 급격한 열충격 방지를 위한 초기 승온 |
| Zone 2 | 가열대 1 | 목표 온도까지 1차 가열 |
| Zone 3 | 가열대 2 | 목표 온도 유지 및 심부 가열 |
| Zone 4 | 균열대 | 전체 단면 온도 균일화 |

### 관련 테이블 (기존)

`heating_processes`, `heating_recipes`, `sensor_data`

---

## 2. 하위메뉴별 사용자 스토리

### US-01: 가열공정 데이터 모니터링 (가열로 운전원 / 공정 엔지니어)

> 가열로 운전원으로서, 4개 존의 현재 온도, 목표 온도, 승온곡선, 체류시간, 에너지 사용량을 실시간으로 한 화면에서 확인하고 싶다. 과열·미열 발생 즉시 인지하여 조치할 수 있어야 하기 때문이다.

**수락 기준**:
- 4존 온도 현황(현재값/목표값/편차) 실시간 표시 (갱신 주기 ≤ 5초)
- 존별 승온곡선 시계열 그래프 제공
- 과열(목표 +20°C 초과) / 미열(목표 -20°C 미만) / 온도 편차 발생 시 색상 경고(빨강/파랑/노랑) 표시
- 현재 체류 중인 소재 수량 및 각 소재별 체류시간 표시
- 에너지 사용량(kWh, m³) 일간/시간별 누적 표시
- 읽기 전용 (모니터링)

### US-02: 작업조건관리 (공정 엔지니어 / 생산 관리자)

> 공정 엔지니어로서, 강종 및 제품 규격에 따른 표준 가열 레시피(존별 목표 온도, 승온 속도, 체류시간)를 등록·수정하고, 변경 이력을 추적하고 싶다. 신규 강종 또는 규격 변경 시 레시피를 빠르게 적용하기 위해서다.

**수락 기준**:
- 레시피 등록 시 강종 코드, 제품 규격, 존별 목표 온도(4존), 승온 속도, 최소/최대 체류시간 입력
- 레시피 수정 시 변경 이유 필수 기록, 수정 전/후 값 감사 로그 자동 저장
- 동일 강종의 레시피 버전 이력 조회 가능
- 레시피 복사(기존 레시피 기반 신규 생성) 기능
- 레시피 활성화/비활성화 상태 전환 가능

### US-03: 공정이력조회 (품질 담당자 / 공정 엔지니어)

> 품질 담당자로서, Heat No.를 입력하면 해당 소재의 가열 이력(온도곡선, 체류시간)과 이후 단조·열처리 공정까지의 연계 결과를 한 화면에서 조회하고 싶다. 품질 불량 발생 시 가열 단계 원인을 분석하기 위해서다.

**수락 기준**:
- Heat No. 또는 LOT 번호 입력으로 해당 소재의 가열 이력 즉시 조회
- 가열 이력에 4존 실제 온도곡선, 총 체류시간, 레시피 준수 여부 포함
- 연계 공정 이력(단조 하중, 열처리 온도, 검사 결과) 탭 형식으로 제공
- 레시피 목표값 vs 실측값 편차 시각화(오버레이 그래프)
- 읽기 전용

### US-04: 공정데이터분석 (공정 엔지니어 / 생산 관리자)

> 공정 엔지니어로서, 월별 가열 온도·에너지·체류시간 데이터를 분석하여 공정 효율을 확인하고, 재가열이 발생한 케이스의 공통 원인을 도출하고 싶다. 에너지 비용 절감 및 재가열률 개선을 위해서다.

**수락 기준**:
- 기간·강종·가열로 기준 공정 효율 지표 집계 차트 제공
- 재가열률 = (재가열 건수 / 전체 가열 건수 × 100) 공식 적용 표시
- 재가열 발생 케이스 목록 및 발생 직전 온도·체류시간 패턴 분석
- 에너지 사용량 트렌드(일/주/월) 꺾은선 그래프
- 가열 파라미터-품질 결과 상관 분석 산점도
- 읽기/차트 전용, Excel 내보내기 지원

### US-05: 가열 최적화 AI 분석 (공정 엔지니어 / AI 엔지니어)

> 공정 엔지니어로서, 특정 강종·규격·소재 상태를 입력하면 ML 모델이 최적 가열조건(존별 온도, 체류시간)을 예측하고, 과열·미열·재가열 발생 가능성을 사전에 알려주길 원한다. 불량 및 에너지 낭비를 사전 예방하기 위해서다.

**수락 기준**:
- 강종, 규격, 현재 소재 온도(표면/심부), 목표 완성 온도 입력으로 예측 실행
- 예측 결과에 존별 권장 온도, 권장 체류시간, 예상 에너지 소비량 포함
- 과열/미열/재가열 위험 확률(%) 및 신뢰도 점수(confidence score, 0.0~1.0) 반드시 표시
- 예측 근거: 유사 과거 Heat No. 상위 5건 표시
- 예측 결과를 레시피로 등록하는 기능(작업조건관리 FR-02 연계)
- 예측 이력 조회 및 예측 정확도 피드백 등록 기능

---

## 3. 기능 요구사항

### FR-01: 가열공정 데이터 모니터링

**설명**: 가열로 4존 실시간 온도·에너지·체류시간 모니터링 대시보드 (조회)

**페이지 경로**: `/heating/monitoring`

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/heating/furnaces` | 가열로 목록 및 현재 상태 |
| GET | `/api/heating/furnaces/:id/realtime` | 특정 가열로 실시간 존별 온도 (SSE 또는 폴링) |
| GET | `/api/heating/furnaces/:id/trend` | 존별 온도 시계열 (쿼리: start, end, interval) |
| GET | `/api/heating/furnaces/:id/energy` | 에너지 사용량 (일간/시간별 집계) |
| GET | `/api/heating/furnaces/:id/materials` | 현재 체류 중인 소재 목록 및 체류시간 |
| GET | `/api/heating/alerts` | 과열/미열/편차 알림 이력 |

**우선순위**: Must

**관련 테이블**: `heating_processes`, `sensor_data`(TimescaleDB), `furnace_alerts`(신규)

---

### FR-02: 작업조건관리

**설명**: 강종·규격별 가열 레시피 CRUD 및 변경 이력 관리

**페이지 경로**: `/heating/recipes`

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/heating-recipes` | 레시피 목록 (필터: 강종, 규격, 상태) |
| POST | `/api/heating-recipes` | 레시피 등록 |
| GET | `/api/heating-recipes/:id` | 레시피 상세 조회 |
| PUT | `/api/heating-recipes/:id` | 레시피 수정 (변경 이유 필수) |
| DELETE | `/api/heating-recipes/:id` | 레시피 비활성화 (soft delete) |
| POST | `/api/heating-recipes/:id/copy` | 레시피 복사 (신규 생성 기반) |
| GET | `/api/heating-recipes/:id/history` | 레시피 변경 이력 |
| PATCH | `/api/heating-recipes/:id/status` | 활성화/비활성화 전환 |

**레시피 핵심 필드**:
- `steel_grade`: 강종 코드
- `product_spec`: 제품 규격
- `zone_targets`: 존별 목표 온도 (Zone 1~4, °C)
- `heating_rate`: 승온 속도 (°C/min)
- `min_residence_time` / `max_residence_time`: 체류시간 범위 (분)
- `version`: 레시피 버전
- `status`: active / inactive

**우선순위**: Must

**관련 테이블**: `heating_recipes`, `recipe_change_logs`(신규)

---

### FR-03: 공정이력조회

**설명**: Heat No. 기준 가열 이력 및 공정 간 품질 연계 이력 조회 (읽기 전용)

**페이지 경로**: `/heating/history`

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/heating/history` | 가열 이력 목록 (필터: 기간, 가열로, 강종) |
| GET | `/api/heating/history/:heatNo` | Heat No. 기준 가열 상세 이력 |
| GET | `/api/heating/history/:heatNo/temperature-curve` | 4존 실제 온도곡선 데이터 |
| GET | `/api/heating/history/:heatNo/process-chain` | 가열-단조-열처리-검사 연계 이력 |
| GET | `/api/heating/history/:heatNo/recipe-deviation` | 레시피 목표 vs 실측 편차 |

**우선순위**: Must

**관련 테이블**: `heating_processes`, `sensor_data`, `heating_recipes`, `lots`, `process_results`, `quality_inspections`

---

### FR-04: 공정데이터분석

**설명**: 가열 온도·에너지·체류시간 기반 공정 효율 분석 및 재가열 원인 분석 (조회/차트)

**페이지 경로**: `/heating/analysis`

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/heating/analysis/efficiency` | 공정 효율 지표 집계 (기간·강종 필터) |
| GET | `/api/heating/analysis/reheat-rate` | 재가열률 트렌드 (일/주/월) |
| GET | `/api/heating/analysis/reheat-cases` | 재가열 발생 케이스 목록 및 원인 패턴 |
| GET | `/api/heating/analysis/energy-trend` | 에너지 사용량 트렌드 |
| GET | `/api/heating/analysis/correlation` | 가열 파라미터-품질 상관 데이터 (산점도용) |
| POST | `/api/heating/analysis/export` | 분석 결과 Excel 내보내기 |

**핵심 KPI 공식**:
- **재가열률** = (재가열 건수 / 전체 가열 건수) × 100 (%)
- **에너지 효율** = 유효 가열 소재 중량(ton) / 총 에너지 소비량(kWh) (ton/kWh)
- **온도 준수율** = (레시피 범위 내 가열 건수 / 전체 가열 건수) × 100 (%)

**우선순위**: Should

**관련 테이블**: `heating_processes`, `sensor_data`(TimescaleDB), `kpi_daily_snapshots`

---

### FR-05: 가열 최적화 AI 분석

**설명**: ML 기반 최적 가열조건 예측, 과열/미열/재가열 사전 예측 (등록/출력)

**페이지 경로**: `/heating/ai-optimization`

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/heating/ai/predict` | 최적 가열조건 예측 요청 |
| GET | `/api/heating/ai/predict/:jobId` | 예측 결과 조회 |
| GET | `/api/heating/ai/predict/history` | 예측 이력 목록 |
| POST | `/api/heating/ai/predict/:jobId/apply` | 예측 결과를 레시피로 등록 (FR-02 연계) |
| POST | `/api/heating/ai/predict/:jobId/feedback` | 예측 정확도 피드백 등록 |
| GET | `/api/heating/ai/model-info` | 현재 AI 모델 버전 및 학습 기준 정보 |

**예측 요청 입력 필드**:
- `steel_grade`: 강종 코드
- `product_spec`: 제품 규격
- `initial_surface_temp`: 소재 표면 초기 온도 (°C)
- `initial_core_temp`: 소재 심부 초기 온도 (°C, 선택)
- `target_output_temp`: 목표 출측 온도 (°C)
- `material_weight`: 소재 중량 (ton)

**AI 응답 필수 필드**:
- `recommended_zones`: 존별 권장 온도 (Zone 1~4, °C)
- `recommended_residence_time`: 권장 체류시간 (분)
- `estimated_energy`: 예상 에너지 소비량 (kWh)
- `overheat_risk`: 과열 위험 확률 (%)
- `underheat_risk`: 미열 위험 확률 (%)
- `reheat_risk`: 재가열 위험 확률 (%)
- `confidence_score`: 신뢰도 점수 (0.0~1.0) — 필수
- `similar_cases`: 유사 과거 Heat No. 상위 5건

**우선순위**: Could

**관련 테이블**: `heating_processes`, `heating_recipes`, `ai_heating_predictions`(신규), `ai_prediction_feedback`(신규)

---

## 4. API 엔드포인트 목록

| 하위메뉴 | Method | Path | 우선순위 |
|----------|--------|------|----------|
| 가열공정 데이터 모니터링 | GET | `/api/heating/furnaces` | Must |
| 가열공정 데이터 모니터링 | GET | `/api/heating/furnaces/:id/realtime` | Must |
| 가열공정 데이터 모니터링 | GET | `/api/heating/furnaces/:id/trend` | Must |
| 가열공정 데이터 모니터링 | GET | `/api/heating/furnaces/:id/energy` | Must |
| 가열공정 데이터 모니터링 | GET | `/api/heating/furnaces/:id/materials` | Must |
| 가열공정 데이터 모니터링 | GET | `/api/heating/alerts` | Must |
| 작업조건관리 | GET | `/api/heating-recipes` | Must |
| 작업조건관리 | POST | `/api/heating-recipes` | Must |
| 작업조건관리 | GET | `/api/heating-recipes/:id` | Must |
| 작업조건관리 | PUT | `/api/heating-recipes/:id` | Must |
| 작업조건관리 | DELETE | `/api/heating-recipes/:id` | Must |
| 작업조건관리 | POST | `/api/heating-recipes/:id/copy` | Must |
| 작업조건관리 | GET | `/api/heating-recipes/:id/history` | Must |
| 공정이력조회 | GET | `/api/heating/history` | Must |
| 공정이력조회 | GET | `/api/heating/history/:heatNo` | Must |
| 공정이력조회 | GET | `/api/heating/history/:heatNo/temperature-curve` | Must |
| 공정이력조회 | GET | `/api/heating/history/:heatNo/process-chain` | Must |
| 공정이력조회 | GET | `/api/heating/history/:heatNo/recipe-deviation` | Must |
| 공정데이터분석 | GET | `/api/heating/analysis/efficiency` | Should |
| 공정데이터분석 | GET | `/api/heating/analysis/reheat-rate` | Should |
| 공정데이터분석 | GET | `/api/heating/analysis/reheat-cases` | Should |
| 공정데이터분석 | GET | `/api/heating/analysis/energy-trend` | Should |
| 공정데이터분석 | GET | `/api/heating/analysis/correlation` | Should |
| 공정데이터분석 | POST | `/api/heating/analysis/export` | Should |
| 가열 최적화 AI 분석 | POST | `/api/heating/ai/predict` | Could |
| 가열 최적화 AI 분석 | GET | `/api/heating/ai/predict/:jobId` | Could |
| 가열 최적화 AI 분석 | GET | `/api/heating/ai/predict/history` | Could |
| 가열 최적화 AI 분석 | POST | `/api/heating/ai/predict/:jobId/apply` | Could |
| 가열 최적화 AI 분석 | POST | `/api/heating/ai/predict/:jobId/feedback` | Could |

---

## 5. 구현 우선순위

### MoSCoW 분류

| 우선순위 | 기능 | 이유 |
|----------|------|------|
| Must | FR-01 가열공정 데이터 모니터링 | 가열로 운전의 핵심 안전 기능 — 실시간 이상 감지 필수 |
| Must | FR-02 작업조건관리 | 레시피 없이 FR-01 모니터링과 FR-05 AI 예측 모두 동작 불가 |
| Must | FR-03 공정이력조회 | Heat No. 기반 품질 추적성 — 사업계획서 핵심 요구사항 |
| Should | FR-04 공정데이터분석 | KPI 개선 도구 — 운영 안정화 후 단계적 도입 가능 |
| Could | FR-05 가열 최적화 AI 분석 | ML 모델 학습 완료 후 적용 — AI 서비스 준비 기간 필요 |

### 구현 순서

1. FR-02 작업조건관리 (레시피 데이터 먼저 구축)
2. FR-01 가열공정 데이터 모니터링 (TimescaleDB SSE/폴링 연동)
3. FR-03 공정이력조회 (공정 간 연계 쿼리 구현)
4. FR-04 공정데이터분석 (집계·상관 분석 쿼리)
5. FR-05 가열 최적화 AI 분석 (AI 서비스 FastAPI 연동)

### Out of Scope (이번 이터레이션 제외)

- 가열로 PLC/DCS 직접 연동 제어 (읽기 전용 모니터링만)
- 다공장 가열로 통합 비교 대시보드
- 에너지 비용 정산 연동 (ERP 연계)
- 모바일 현장 운전원 앱

### 신규 DB 테이블 (필요)

| 테이블명 | 목적 |
|----------|------|
| `furnace_alerts` | 과열/미열/온도 편차 알림 이력 |
| `recipe_change_logs` | 레시피 변경 감사 로그 |
| `ai_heating_predictions` | AI 가열조건 예측 결과 이력 |
| `ai_prediction_feedback` | 예측 정확도 피드백 데이터 |

---

## 6. 비기능 요구사항

| 항목 | 요구 기준 |
|------|-----------|
| 실시간 모니터링 갱신 주기 | ≤ 5초 (SSE 또는 폴링) |
| 온도곡선 이력 조회 응답 | ≤ 2초 (1개 Heat No. 기준) |
| 공정 연계 이력 조회 응답 | ≤ 2초 |
| 분석 집계 쿼리 응답 | ≤ 5초 (월간 전체 데이터 기준) |
| AI 예측 응답 시간 | ≤ 10초 |
| AI 응답 신뢰도 점수 | 반드시 포함 (0.0~1.0) |
| 레시피 변경 감사 로그 | 100% 기록 |
| 센서 데이터 보존 기간 | 2년 (TimescaleDB 자동 파티션 관리) |

---

## 7. 성공 지표

| 지표 | 목표값 | 측정 방법 |
|------|--------|-----------|
| 실시간 모니터링 데이터 지연 | ≤ 5초 | 센서 타임스탬프 vs 화면 표시 비교 |
| 과열/미열 알림 감지 정확도 | 100% (임계값 기준) | 시뮬레이션 테스트 |
| Heat No. 기준 공정 연계 이력 완결성 | 가열~검사 전 구간 단절 없음 | 통합 테스트 |
| 재가열률 KPI 계산 정확도 | ± 0 (원시 데이터 기준) | 검증 쿼리 비교 |
| AI 예측 신뢰도 점수 표시 | 100% 응답에 포함 | API 응답 검증 |
| 레시피 변경 감사 로그 누락률 | 0% | DB 로그 검증 |

---

## 관련 문서

- Plan (전체 모듈): `docs/01-plan/03-PM-process-data-ai-kpi.md`
- Design (예정): `docs/02-design/features/heating-submenus.design.md`
- 연관 Plan: `docs/01-plan/features/raw-materials-submenus.plan.md`
- 연관 Plan: `docs/01-plan/features/data-management.plan.md`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-05-21 | Initial draft — 5개 FR, MoSCoW 우선순위 적용 (사업계획서 p.41-42 기반) | PM Agent |
