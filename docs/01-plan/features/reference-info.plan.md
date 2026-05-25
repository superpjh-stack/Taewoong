# [Plan] 기준정보관리 (reference-info)

> **Summary**: 품질기준·작업표준·코드 등 MES 운영의 근간이 되는 기준 데이터를 중앙에서 등록·관리·조회하는 모듈
>
> **Author**: PM Agent
> **Created**: 2026-05-21
> **Last Modified**: 2026-05-21
> **Status**: Draft

---

## 1. 개요

### 목적

기준정보관리 모듈은 TaeWoong AI-MES 전 공정에서 공통으로 참조되는 기준 데이터를 일원화하여 관리한다.
품질판정 기준, 공정별 작업표준(SOP), 시스템 전반의 코드 체계를 CRUD 인터페이스로 운영함으로써
데이터 정합성을 확보하고 작업자 간 편차를 최소화하는 것이 목적이다.

### 범위

| 하위 기능 | 설명 |
|-----------|------|
| 품질기준 관리 | 제품(소재)별 품질 기준 및 검사 기준 등록·조회·수정·비활성화 |
| 작업표준 관리 | 공정별 SOP(작업 절차 및 조건) 등록·조회·수정·비활성화 |
| 코드 관리 | 품목·공정·설비·판정 등 시스템 전역 코드 등록·조회·수정·비활성화 |

### 우선순위 (MoSCoW)

| 기능 | 우선순위 | 근거 |
|------|----------|------|
| 품질기준 관리 (CRUD) | Must | 품질검사 모듈의 판정 로직이 이 테이블을 직접 참조 |
| 작업표준 관리 (CRUD) | Must | 가열·단조·열처리 공정 실행 시 SOP 화면 표시에 필요 |
| 코드 관리 (CRUD) | Must | 전 모듈에서 공통 코드 드롭다운으로 사용 |
| 버전 이력 조회 | Should | 규격 변경 추적, 감사 대응 |
| 첨부파일 업로드 (SOP 문서) | Should | 작업표준의 PDF·도면 첨부 |
| 코드 일괄 Import (CSV) | Could | 초기 세팅 편의성 향상 |
| 코드 간 계층 구조 (Tree) | Could | 대분류-중분류-소분류 코드 체계 시각화 |
| 외부 시스템 코드 연동 | Won't | 현 단계 외부 ERP 연동 범위 외 |

---

## 2. 사용자 스토리

### 2-1. 품질기준 관리

**US-QS-01** — 품질 담당자로서, 소재 유형·고객사별로 품질 기준(인장강도, 경도 등)을 등록하고 싶다.
그래야 검사 화면에서 해당 기준을 자동으로 불러와 합격·불합격을 판정할 수 있다.

수용 기준:
- `spec_code`, `material_type`, `customer_code`, `standard`, `inspection_type`, `criteria` 필드를 입력해 저장할 수 있다.
- 동일 `spec_code`로 신규 버전 등록 시 기존 버전은 자동으로 `is_active = false` 처리된다.
- 목록 화면에서 소재 유형·고객사·활성 여부로 필터링 및 페이지네이션이 동작한다.

**US-QS-02** — 품질 담당자로서, 더 이상 사용하지 않는 품질 기준을 비활성화(삭제 대신)하고 싶다.
그래야 이력 데이터를 보존하면서 검사 화면에서 해당 기준이 선택되지 않도록 할 수 있다.

수용 기준:
- 비활성화 버튼 클릭 시 확인 모달이 표시되고, 확인 후 `is_active = false`로 변경된다.
- 비활성화된 기준은 검사 화면의 기준 선택 드롭다운에 표시되지 않는다.
- 기준정보 관리 목록에서는 '비활성 포함' 필터로 조회 가능하다.

---

### 2-2. 작업표준 관리

**US-WS-01** — 공정 엔지니어로서, 공정 유형별로 작업 절차와 조건 기준을 등록하고 싶다.
그래야 작업자가 공정 실행 화면에서 해당 SOP를 즉시 참조할 수 있다.

수용 기준:
- `standard_code`, `process_type`, `title`, `content`, `version` 필드를 입력해 저장할 수 있다.
- 첨부파일(PDF, 이미지)을 업로드하면 `attachment_url`에 경로가 저장된다.
- 목록 화면에서 공정 유형·활성 여부로 필터링이 동작한다.

**US-WS-02** — 공정 엔지니어로서, 기존 작업표준을 수정할 때 이전 버전을 보존하고 싶다.
그래야 변경 이력을 추적하고 필요 시 이전 버전을 조회할 수 있다.

수용 기준:
- 수정 저장 시 `version` 값이 자동 증가(예: 1.0 → 1.1)되어 신규 레코드로 저장된다.
- 이전 버전 레코드는 `is_active = false`로 보존된다.
- 상세 화면에서 동일 `standard_code`의 버전 이력 목록을 확인할 수 있다.

---

### 2-3. 코드 관리

**US-CM-01** — 시스템 관리자로서, 품목·공정·설비·판정 코드를 카테고리별로 등록·수정하고 싶다.
그래야 전 모듈의 드롭다운 목록이 일관된 코드 체계를 참조하도록 할 수 있다.

수용 기준:
- `category`, `code`, `name`, `name_en`, `sort_order` 필드를 입력해 저장할 수 있다.
- 동일 `category` 내 `code` 중복 등록 시 에러 메시지가 표시된다.
- 목록 화면에서 카테고리별로 필터링하고 `sort_order` 기준으로 정렬된 결과가 표시된다.

**US-CM-02** — 시스템 관리자로서, 코드 정렬 순서를 드래그 앤 드롭으로 변경하고 싶다.
그래야 드롭다운 표시 순서를 직관적으로 관리할 수 있다.

수용 기준:
- 목록 행을 드래그하면 `sort_order`가 실시간으로 업데이트된다.
- 저장 버튼 없이 드롭 즉시 API가 호출되어 반영된다.

---

## 3. 기능 요구사항

### FR-01: 품질기준 목록 조회

- `GET /reference/quality-specs` 엔드포인트를 호출하여 목록을 표시한다.
- 쿼리 파라미터: `material_type`, `customer_code`, `is_active`, `page`, `limit`
- 컬럼: 기준코드, 소재유형, 고객사코드, 검사유형, 버전, 활성여부, 등록일
- 페이지네이션: 20건/페이지 기본값

### FR-02: 품질기준 등록

- `POST /reference/quality-specs` 호출.
- 필수 입력: `spec_code`, `material_type`, `standard`, `inspection_type`, `criteria`
- 선택 입력: `customer_code`
- 저장 성공 시 목록 화면으로 이동하며 상단에 성공 토스트가 표시된다.

### FR-03: 품질기준 수정

- `PATCH /reference/quality-specs/:id` 호출.
- 수정 저장 시 신규 버전 레코드 생성 + 기존 레코드 `is_active = false` 처리.

### FR-04: 품질기준 비활성화

- `PATCH /reference/quality-specs/:id/deactivate` 호출.
- 물리 삭제 금지 — 소프트 삭제(is_active = false)만 허용.

### FR-05: 작업표준 목록 조회

- `GET /reference/work-standards` 엔드포인트 호출.
- 쿼리 파라미터: `process_type`, `is_active`, `page`, `limit`
- 컬럼: 표준코드, 공정유형, 제목, 버전, 활성여부, 첨부파일 유무, 수정일

### FR-06: 작업표준 등록/수정

- 등록: `POST /reference/work-standards`
- 수정: `PATCH /reference/work-standards/:id` (버전 자동 증가)
- 첨부파일: Multipart Form 업로드, 허용 확장자 PDF·PNG·JPG, 최대 10MB

### FR-07: 작업표준 비활성화

- `PATCH /reference/work-standards/:id/deactivate` 호출.
- 물리 삭제 금지.

### FR-08: 코드 목록 조회

- `GET /reference/codes` 엔드포인트 호출.
- 쿼리 파라미터: `category`, `is_active`
- 카테고리 탭 UI로 카테고리 전환 시 필터 자동 적용.
- `sort_order` 오름차순 정렬.

### FR-09: 코드 등록/수정

- 등록: `POST /reference/codes`
- 수정: `PATCH /reference/codes/:category/:code`
- `code` 필드는 등록 후 수정 불가 (PK 역할).

### FR-10: 코드 비활성화

- `PATCH /reference/codes/:category/:code/deactivate` 호출.
- 물리 삭제 금지.

### FR-11: 코드 정렬 순서 변경

- `PATCH /reference/codes/reorder` — 카테고리 내 sort_order 일괄 업데이트.
- 요청 바디: `[{ category, code, sort_order }, ...]`

---

## 4. 비기능 요구사항

### 4-1. 성능

| 항목 | 기준 |
|------|------|
| 목록 조회 응답시간 | p95 ≤ 300ms (건수 ≤ 1,000건 기준) |
| 코드 드롭다운 캐시 | Redis 캐시 TTL 10분 (전 모듈 공통 참조 빈도 높음) |
| 첨부파일 업로드 | 최대 10MB, 업로드 완료 응답 ≤ 5s |

### 4-2. 보안

| 항목 | 기준 |
|------|------|
| 조회 권한 | 로그인한 모든 사용자 |
| 등록·수정·비활성화 권한 | ROLE: `ADMIN`, `QUALITY_MGR`, `PROCESS_ENG` |
| 코드 관리 권한 | ROLE: `ADMIN` 전용 |
| 감사 로그 | 등록·수정·비활성화 이벤트 발생 시 `audit_logs` 테이블에 기록 |

### 4-3. UI/UX

- 목록 화면: 검색 필터 영역 + 테이블 + 페이지네이션을 단일 페이지에 배치.
- 등록·수정: 모달 다이얼로그 또는 사이드 패널 (페이지 전환 최소화).
- 비활성화 실행 전 반드시 확인 모달 표시.
- 활성/비활성 상태는 Badge 컴포넌트(녹색/회색)로 시각 구분.
- 품질기준 `criteria` 필드는 JSON 구조 — UI에서 Key/Value 다중 입력 폼으로 표현.

---

## 5. 구현 범위

### In Scope

- 품질기준 관리 CRUD (소프트 삭제 포함, 버전 관리 포함)
- 작업표준 관리 CRUD (소프트 삭제 포함, 버전 관리 포함, 첨부파일 업로드)
- 코드 관리 CRUD (소프트 삭제 포함, sort_order 변경)
- 권한 기반 UI 렌더링 (버튼 노출 여부)
- Redis 캐시 — 코드 목록 캐싱
- 감사 로그 연동

### Out of Scope

- 코드 CSV 일괄 Import/Export
- 코드 계층 구조(Tree) 시각화
- 외부 ERP 코드 동기화
- 품질기준 자동 추천 (AI)
- 작업표준 전자결재 워크플로우

---

## 6. 의존성

### 6-1. DB 테이블

| 테이블 | 역할 | 비고 |
|--------|------|------|
| `quality_specs` | 품질기준 저장 | 기존 테이블 활용, `version` 컬럼 신규 버전 삽입 방식 |
| `work_standards` | 작업표준 저장 | 기존 테이블 활용, `attachment_url` 파일 스토리지 경로 |
| `code_masters` | 공통 코드 저장 | 기존 테이블 활용 |
| `audit_logs` | 변경 이력 기록 | M6 시스템관리 모듈 공유 테이블 |

### 6-2. API 엔드포인트 (신규 설계 필요)

| Method | Path | 기능 |
|--------|------|------|
| GET | `/reference/quality-specs` | 품질기준 목록 |
| POST | `/reference/quality-specs` | 품질기준 등록 |
| PATCH | `/reference/quality-specs/:id` | 품질기준 수정 (버전 증가) |
| PATCH | `/reference/quality-specs/:id/deactivate` | 품질기준 비활성화 |
| GET | `/reference/work-standards` | 작업표준 목록 |
| POST | `/reference/work-standards` | 작업표준 등록 |
| PATCH | `/reference/work-standards/:id` | 작업표준 수정 (버전 증가) |
| PATCH | `/reference/work-standards/:id/deactivate` | 작업표준 비활성화 |
| GET | `/reference/codes` | 코드 목록 |
| POST | `/reference/codes` | 코드 등록 |
| PATCH | `/reference/codes/:category/:code` | 코드 수정 |
| PATCH | `/reference/codes/:category/:code/deactivate` | 코드 비활성화 |
| PATCH | `/reference/codes/reorder` | 코드 정렬 순서 일괄 변경 |

### 6-3. 프론트엔드 라우트

| 라우트 | 화면 |
|--------|------|
| `/reference/quality-specs` | 품질기준 목록 + 등록·수정 모달 |
| `/reference/work-standards` | 작업표준 목록 + 등록·수정 모달 |
| `/reference/codes` | 코드 목록 (카테고리 탭) + 등록·수정 모달 |

### 6-4. 연관 모듈

- **M4 검사출하관리**: `quality_specs` 테이블을 판정 기준으로 참조
- **M3 가열공정관리 / M5 공정관리**: `work_standards`, `code_masters` 조회
- **M6 시스템관리**: RBAC 권한 체계, `audit_logs` 공유
- **M8 데이터관리**: 기준정보 이력 데이터 조회·다운로드 대상 포함

---

## 7. 성공 지표

| 지표 | 목표 |
|------|------|
| 품질기준 등록 완료율 | 전체 운영 품질기준 100% 등록 (go-live 이전) |
| 코드 드롭다운 응답 캐시 히트율 | ≥ 90% |
| 검사 화면 기준 자동 로드 성공률 | ≥ 99% |
| 기준 변경 시 감사 로그 기록률 | 100% |

---

## Related Documents

- Plan: [reference-info.plan.md](../01-plan/features/reference-info.plan.md)
- 사업계획서 참조: p.40-43 기능구조도 (기준정보관리 섹션)
- 연관 모듈 기획: [docs/01-plan/03-PM-process-data-ai-kpi.md](../03-PM-process-data-ai-kpi.md)
