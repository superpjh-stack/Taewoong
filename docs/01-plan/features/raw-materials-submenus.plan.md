# [Plan] 입고배합관리 하위메뉴 (raw-materials-submenus)

> **Summary**: 원료 입고 등록·검수·LOT 생성, 원자재 이력 조회, 데이터 정합성 관리, 공급처 품질분석, AI Agent 기반 품질 판단 5개 하위메뉴
>
> **Author**: Product Manager Agent
> **Created**: 2026-05-21
> **Last Modified**: 2026-05-21
> **Status**: Draft

---

## 1. 개요

### 배경 및 목적

㈜태웅 AI-MES 입고배합관리 모듈(M1)은 단조·열처리 공정 전 단계에서 원료의 품질과 이력을 체계적으로 관리한다. 원료의 성분, 공급사, Heat No. 정보는 이후 가열→단조→열처리→검사 전 공정에서 LOT 추적성의 출발점이 된다.

5개 하위메뉴는 다음 목적을 달성한다.

1. **입고관리** — 원료 입고 등록·검수·LOT 생성으로 자재 흐름 기록의 시작점 확보
2. **원자재 이력조회** — 공급사·성분·LOT 기반 품질 이력 추적으로 불량 원인 소급 분석
3. **입고 데이터관리** — 데이터 정합성 검증 및 표준화로 AI 학습 입력 품질 보장
4. **공급처 품질분석** — 공급사별 불량률·납기 신뢰도 분석으로 데이터 기반 공급사 평가
5. **입고 AI Agent** — 자연어 기반 즉시 품질 판단 및 배합 조건 추천

### 모듈 위치

사업계획서 기능구조도 p.41, 최상위 메뉴 **M1: 입고배합관리** 하위 5개 기능.

### 관련 테이블 (기존)

`raw_materials`, `suppliers`, `heats`, `lots`

---

## 2. 하위메뉴별 사용자 스토리

### US-01: 입고관리 (자재 담당자)

> 자재 담당자로서, 원료가 입고될 때 Heat No. 기준으로 입고 정보를 등록하고 검수 결과를 기록한 뒤 LOT를 생성하고 싶다. 이후 공정에서 원료의 출처와 성분을 추적할 수 있어야 하기 때문이다.

**수락 기준**:
- Heat No. 입력 시 제강 공정 연계 정보(강종, 용해량) 자동 조회 가능
- 입고 등록 시 공급사, 규격, 성분 분석값, 수량, 수령일 필드 필수 입력
- 검수 합격 처리 시 LOT 번호 자동 생성(규칙: `LOT-{YYYYMMDD}-{순번}`)
- 검수 불합격 시 반품 처리 상태로 전환, 반품 사유 필수 기록
- 등록된 입고 데이터 수정·삭제(soft delete) 가능

### US-02: 원자재 이력조회 (품질 담당자)

> 품질 담당자로서, 특정 공급사 또는 LOT 번호를 조건으로 원자재의 성분 분석 이력과 과거 품질 문제 이력을 조회하고 싶다. 클레임 발생 시 원인 원료를 빠르게 특정하기 위해서다.

**수락 기준**:
- 공급사, 성분 범위, LOT 번호, 기간 등 복합 조건 조회 지원
- 조회 결과에 성분 분석값(C, Si, Mn, P, S 등), 검수 결과, 연계 공정 이력 표시
- 과거 품질 문제(불합격·반품 이력) 건수 하이라이트 표시
- 단일 LOT에서 파생된 하위 LOT 연계 조회(Closure Table 기반 트리 뷰)
- 읽기 전용 (쓰기 없음)

### US-03: 입고 데이터관리 (데이터 관리자 / AI 엔지니어)

> 데이터 관리자로서, 입고된 원자재 데이터의 결측·오류·비표준 값을 검증하고 수정하여 AI 모델 학습에 사용할 수 있는 품질 수준을 유지하고 싶다.

**수락 기준**:
- 입고 데이터 일괄 검증 실행 시 결측률, 범위 이탈값, 형식 오류 건수 표시
- 검증 오류 항목별 원본 값 / 권장 수정값 표시 및 일괄 수정 기능
- 표준화 규칙(단위 통일, 성분 소수점 자릿수 등) 등록·수정·삭제 가능
- 수정 이력 감사 로그 자동 기록 (수정자, 수정 전/후 값, 수정 일시)
- AI 학습용 데이터로 승인 처리 기능 (승인 상태 플래그)

### US-04: 공급처 품질분석 (구매 관리자 / 경영진)

> 구매 관리자로서, 공급사별 납품 품질 수준(불량률, 성분 편차), 납기 신뢰도, 반품 빈도를 대시보드로 확인하고 싶다. 공급사 등급 평가 및 계약 갱신 의사결정에 활용하기 위해서다.

**수락 기준**:
- 공급사별 불량률(%), 반품 건수, 성분 편차 지수 집계 표시
- 평가 기간 필터(월/분기/연) 적용 가능
- 공급사 랭킹 정렬(불량률 기준 오름차순)
- 납기 신뢰도(약속 납기일 대비 실제 납기일 준수율) 지표 포함
- 읽기/출력 전용 (쓰기 없음), Excel 내보내기 지원

### US-05: 입고 AI Agent (생산 담당자 / 품질 담당자)

> 생산 담당자로서, "이 Heat No.의 원료가 A제품 단조에 적합한가?" 와 같이 자연어로 질의하면 즉시 품질 적합성 판단과 배합 조건 추천을 받고 싶다. 입고 검토 의사결정 시간을 단축하기 위해서다.

**수락 기준**:
- 자연어 질의 입력창 제공, 스트리밍 응답(타이핑 효과) 표시
- 질의 응답 시 참조한 데이터 출처(Heat No., LOT, 성분 이력) 함께 표시
- 배합 조건 추천 시 근거 데이터(유사 과거 사례, 성분 비교) 포함
- AI 응답에 신뢰도 점수(confidence score, 0.0~1.0) 반드시 표시
- 조회 이력(최근 10건) 사이드패널에 표시
- 읽기/조회 전용 (데이터 수정 없음)

---

## 3. 기능 요구사항

### FR-01: 입고관리

**설명**: 원료 입고 등록, 검수 처리, LOT 생성 및 자재 흐름 CRUD

**페이지 경로**: `/raw-materials/receiving`

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/receiving` | 입고 목록 조회 (필터: 기간, 공급사, 검수 상태) |
| POST | `/api/receiving` | 신규 입고 등록 |
| GET | `/api/receiving/:id` | 입고 상세 조회 |
| PUT | `/api/receiving/:id` | 입고 정보 수정 |
| DELETE | `/api/receiving/:id` | 입고 삭제 (soft delete) |
| POST | `/api/receiving/:id/inspect` | 검수 결과 등록 (합격/불합격) |
| POST | `/api/receiving/:id/lot` | LOT 생성 (검수 합격 후) |
| GET | `/api/heats/:heatNo` | Heat No. 기준 제강 연계 정보 조회 |

**우선순위**: Must

**관련 테이블**: `raw_materials`, `heats`, `lots`, `suppliers`

---

### FR-02: 원자재 이력조회

**설명**: 공급사·성분·LOT 기반 원자재 품질 이력 조회 (읽기 전용)

**페이지 경로**: `/raw-materials/history`

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/raw-materials/history` | 원자재 이력 목록 (필터: 공급사, 기간, 성분 범위) |
| GET | `/api/raw-materials/history/:lotId` | LOT 기준 상세 이력 (공정 연계 포함) |
| GET | `/api/raw-materials/history/:lotId/lineage` | LOT 파생 트리 (Closure Table) |
| GET | `/api/raw-materials/issues` | 품질 문제 이력 목록 (불합격·반품) |
| GET | `/api/suppliers/:supplierId/history` | 공급사별 공급 이력 요약 |

**우선순위**: Must

**관련 테이블**: `raw_materials`, `lots`, `heats`, `suppliers`, `lot_closure`(Closure Table)

---

### FR-03: 입고 데이터관리

**설명**: 입고 데이터 정합성 검증, 표준화, 수정 이력 관리 CRUD

**페이지 경로**: `/raw-materials/data-management`

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/raw-materials/validate` | 입고 데이터 일괄 검증 실행 |
| GET | `/api/raw-materials/validate/results` | 검증 결과 목록 (오류·결측 건) |
| PUT | `/api/raw-materials/:id/correct` | 개별 데이터 수정 (감사 로그 자동 기록) |
| POST | `/api/raw-materials/bulk-correct` | 일괄 수정 (배치) |
| GET | `/api/standardization-rules` | 표준화 규칙 목록 |
| POST | `/api/standardization-rules` | 표준화 규칙 등록 |
| PUT | `/api/standardization-rules/:id` | 표준화 규칙 수정 |
| DELETE | `/api/standardization-rules/:id` | 표준화 규칙 삭제 |
| POST | `/api/raw-materials/:id/approve-ai` | AI 학습용 데이터 승인 처리 |
| GET | `/api/raw-materials/correction-log` | 수정 감사 로그 조회 |

**우선순위**: Should

**관련 테이블**: `raw_materials`, `data_correction_logs`(신규), `standardization_rules`(신규)

---

### FR-04: 공급처 품질분석

**설명**: 공급사별 품질 수준 및 납기 신뢰도 집계 분석 대시보드 (읽기/출력)

**페이지 경로**: `/raw-materials/supplier-analysis`

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/suppliers/quality-summary` | 공급사별 품질 지표 요약 (기간 필터) |
| GET | `/api/suppliers/:id/quality-trend` | 특정 공급사 품질 트렌드 (시계열) |
| GET | `/api/suppliers/ranking` | 공급사 불량률 기준 랭킹 |
| GET | `/api/suppliers/delivery-reliability` | 납기 신뢰도 지표 |
| POST | `/api/suppliers/quality-report/export` | 공급처 품질분석 Excel 내보내기 |

**집계 지표**:
- `defect_rate`: 불량률 (불합격 건수 / 전체 입고 건수 × 100)
- `return_count`: 반품 건수
- `composition_deviation`: 성분 편차 지수 (표준 편차 기반)
- `delivery_reliability`: 납기 신뢰도 (약속 납기 준수율 %)

**우선순위**: Should

**관련 테이블**: `raw_materials`, `suppliers`, `heats`

---

### FR-05: 입고 AI Agent

**설명**: 자연어 기반 원료 품질·이력·적합성 즉시 판단 및 배합 조건 추천 (조회)

**페이지 경로**: `/raw-materials/ai-agent`

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/ai-agent/raw-materials/query` | 자연어 질의 처리 (스트리밍 응답) |
| GET | `/api/ai-agent/raw-materials/history` | 최근 질의 이력 (최근 50건) |
| GET | `/api/ai-agent/raw-materials/suggestions` | 추천 질의 문구 목록 |

**AI 응답 필수 필드**:
- `answer`: 자연어 응답 텍스트
- `confidence_score`: 신뢰도 점수 (0.0~1.0)
- `references`: 참조 데이터 출처 목록 (Heat No., LOT, 성분 이력)
- `recommendation`: 배합 조건 추천 (해당 시)
- `similar_cases`: 유사 과거 사례 (최대 3건)

**우선순위**: Could

**관련 테이블**: `raw_materials`, `lots`, `heats`, `suppliers`, `ai_query_logs`(신규)

---

## 4. API 엔드포인트 목록

| 하위메뉴 | Method | Path | 우선순위 |
|----------|--------|------|----------|
| 입고관리 | GET | `/api/receiving` | Must |
| 입고관리 | POST | `/api/receiving` | Must |
| 입고관리 | GET | `/api/receiving/:id` | Must |
| 입고관리 | PUT | `/api/receiving/:id` | Must |
| 입고관리 | DELETE | `/api/receiving/:id` | Must |
| 입고관리 | POST | `/api/receiving/:id/inspect` | Must |
| 입고관리 | POST | `/api/receiving/:id/lot` | Must |
| 입고관리 | GET | `/api/heats/:heatNo` | Must |
| 원자재 이력조회 | GET | `/api/raw-materials/history` | Must |
| 원자재 이력조회 | GET | `/api/raw-materials/history/:lotId` | Must |
| 원자재 이력조회 | GET | `/api/raw-materials/history/:lotId/lineage` | Must |
| 원자재 이력조회 | GET | `/api/raw-materials/issues` | Must |
| 원자재 이력조회 | GET | `/api/suppliers/:supplierId/history` | Must |
| 입고 데이터관리 | POST | `/api/raw-materials/validate` | Should |
| 입고 데이터관리 | GET | `/api/raw-materials/validate/results` | Should |
| 입고 데이터관리 | PUT | `/api/raw-materials/:id/correct` | Should |
| 입고 데이터관리 | POST | `/api/raw-materials/bulk-correct` | Should |
| 입고 데이터관리 | GET/POST/PUT/DELETE | `/api/standardization-rules` | Should |
| 입고 데이터관리 | POST | `/api/raw-materials/:id/approve-ai` | Should |
| 공급처 품질분석 | GET | `/api/suppliers/quality-summary` | Should |
| 공급처 품질분석 | GET | `/api/suppliers/:id/quality-trend` | Should |
| 공급처 품질분석 | GET | `/api/suppliers/ranking` | Should |
| 공급처 품질분석 | GET | `/api/suppliers/delivery-reliability` | Should |
| 공급처 품질분석 | POST | `/api/suppliers/quality-report/export` | Should |
| 입고 AI Agent | POST | `/api/ai-agent/raw-materials/query` | Could |
| 입고 AI Agent | GET | `/api/ai-agent/raw-materials/history` | Could |
| 입고 AI Agent | GET | `/api/ai-agent/raw-materials/suggestions` | Could |

---

## 5. 구현 우선순위

### MoSCoW 분류

| 우선순위 | 기능 | 이유 |
|----------|------|------|
| Must | FR-01 입고관리 | LOT 생성은 전 공정 추적성의 출발점 — 없으면 시스템 전체 동작 불가 |
| Must | FR-02 원자재 이력조회 | Closure Table 기반 LOT 이력 추적은 핵심 비즈니스 요구사항 |
| Should | FR-03 입고 데이터관리 | AI 학습 품질 보장에 필요하지만 운영 초기 수동 관리 가능 |
| Should | FR-04 공급처 품질분석 | 의사결정 지원 기능 — 초기 운영에서 보조 역할 |
| Could | FR-05 입고 AI Agent | 편의 기능 — AI 모델 학습 완료 후 적용 |

### 구현 순서

1. FR-01 입고관리 (LOT 생성 포함) — 데이터 흐름 기초 확보
2. FR-02 원자재 이력조회 (Closure Table 쿼리 포함)
3. FR-03 입고 데이터관리 — 표준화 규칙 적용
4. FR-04 공급처 품질분석 — 집계 쿼리 구현
5. FR-05 입고 AI Agent — AI 서비스 연동

### Out of Scope (이번 이터레이션 제외)

- 실시간 입고 알림 푸시 (모바일 연동)
- EDI/ERP 자동 연동 입고 인터페이스
- 바코드/QR 스캐너 입고 처리
- 원자재 재고 수량 실시간 관리 (별도 재고관리 모듈)

### 신규 DB 테이블 (필요)

| 테이블명 | 목적 |
|----------|------|
| `data_correction_logs` | 입고 데이터 수정 감사 로그 |
| `standardization_rules` | 데이터 표준화 규칙 정의 |
| `ai_query_logs` | AI Agent 질의 이력 |

---

## 6. 비기능 요구사항

| 항목 | 요구 기준 |
|------|-----------|
| 입고 등록 응답 시간 | ≤ 1초 |
| LOT 이력 조회 응답 시간 | ≤ 2초 (Closure Table 전체 트리) |
| 공급처 품질분석 집계 응답 | ≤ 3초 (연간 데이터 기준) |
| AI Agent 첫 응답 시작 | ≤ 3초 (스트리밍 시작 기준) |
| AI 응답 신뢰도 점수 | 반드시 포함 (0.0~1.0) |
| 데이터 수정 감사 로그 | 100% 기록 |

---

## 7. 성공 지표

| 지표 | 목표값 | 측정 방법 |
|------|--------|-----------|
| 입고 LOT 생성 성공률 | 100% (검수 합격 건 기준) | 기능 테스트 |
| LOT 이력 추적 완결성 | Heat No. → 최종 출하까지 단절 없음 | 통합 테스트 |
| 공급처 품질분석 데이터 정확도 | ± 0 (원시 데이터와 일치) | 검증 쿼리 비교 |
| AI Agent 신뢰도 점수 표시 | 100% 응답에 포함 | API 응답 검증 |
| 데이터 수정 감사 로그 누락률 | 0% | DB 로그 검증 |

---

## 관련 문서

- Plan (전체 모듈): `docs/01-plan/03-PM-process-data-ai-kpi.md`
- Design (예정): `docs/02-design/features/raw-materials-submenus.design.md`
- 연관 Plan: `docs/01-plan/features/data-management.plan.md`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-05-21 | Initial draft — 5개 FR, MoSCoW 우선순위 적용 (사업계획서 p.41 기반) | PM Agent |
