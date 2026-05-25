# ㈜태웅 제조AI MES — 시스템 아키텍처 설계서

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.0 |
| 작성일 | 2026-05-20 |
| 대상 시스템 | TaeWoong AI-MES (제조AI 특화 스마트공장 MES) |
| 회사 | ㈜태웅 — 중공업 단조/열처리 제조업체 |
| Pipeline Level | Enterprise (Monorepo, AI Native) |
| 핵심 식별자 | Heat No., LOT No. |

## 0. 도메인 개요

태웅은 대형 단조품(풍력 플랜지, 산업용 링 등)을 생산하는 중공업 제조사로, 공정 흐름은 다음과 같다.

```
입고(원료수령) → 가열(가열로) → 단조(Forging) → 열처리(Heat Treatment) → 검사(Inspection) → 출하(Shipment)
```

제조업 MES에서 가장 중요한 것은 **트레이서빌리티(Traceability)** 이다. 출하된 단조품에서 품질 이슈가 발생하면, 어떤 LOT → 어떤 Heat No. → 어떤 원자재(공급사 포함) → 어떤 가열 레시피/공정 조건을 거쳤는지 역추적할 수 있어야 한다. 따라서 본 아키텍처는 **Heat No. 와 LOT No.를 중심으로 한 정·역방향 추적성**을 1급 설계 목표로 삼는다.

---

## 1. 기술 스택 결정

### 1.1 스택 요약

| 레이어 | 기술 | 비고 |
|--------|------|------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui | SSR/RSC 기반 대시보드 |
| 상태/데이터 | TanStack Query, Zustand | 서버 상태/클라이언트 상태 분리 |
| Backend (Core) | Node.js + Express, TypeScript | CRUD/트랜잭션/RBAC |
| Backend (AI) | Python FastAPI | AI Agent, ML 서빙 |
| RDBMS | PostgreSQL 16 | 마스터/트랜잭션 데이터 |
| 시계열 | TimescaleDB (PG extension) | 설비 센서 데이터 |
| 캐시/실시간 | Redis 7 | 캐시, Pub/Sub, 세션, 큐 |
| AI Orchestration | LangChain / LangGraph | 멀티에이전트 |
| ML | scikit-learn / XGBoost | 가열 최적화 회귀모델 |
| Vector Store | pgvector (PostgreSQL extension) | RAG 임베딩 |
| 메시지 큐 | Redis Streams (→ 추후 RabbitMQ) | IoT 수집, 비동기 처리 |
| 패키지 관리 | pnpm workspace + Turborepo | Monorepo |
| 컨테이너 | Docker Compose (local) / K8s (선택) | |

### 1.2 MES 도메인 관점 선택 이유

**Next.js 14 (App Router) + RSC**
- MES 대시보드는 다량의 집계 데이터를 서버에서 미리 렌더링하는 것이 유리하다. React Server Component로 DB 집계 결과를 서버에서 직접 렌더링해 초기 로딩(TTFB)을 단축한다.
- 공정담당자는 현장 단말/태블릿에서 접근하는 경우가 많아, SSR 기반의 빠른 첫 화면이 현장 UX에 중요하다.

**Node.js Express + Python FastAPI 이원화**
- 트랜잭션/CRUD/RBAC 같은 정형 비즈니스 로직은 TypeScript 단일 언어로 프론트와 타입을 공유(`packages/types`)하면 개발 속도와 안정성이 높다.
- 반면 AI Agent(LangGraph), ML(XGBoost), RAG는 Python 생태계가 압도적이다. AI 서비스를 FastAPI로 **물리적으로 분리**하면 모델 추론 부하가 Core API의 응답성에 영향을 주지 않는다. (장애 격리)

**PostgreSQL 16 + TimescaleDB**
- Heat/LOT 트레이서빌리티는 강한 관계 무결성(FK, 제약조건)과 트랜잭션이 필수 → RDBMS.
- 가열로/단조 프레스 등 설비 센서는 초당 수십~수백 포인트의 시계열이다. TimescaleDB의 하이퍼테이블/연속집계(continuous aggregate)로 동일 PostgreSQL 인스턴스 내에서 OLTP와 시계열을 함께 운용 → 운영 단순화 + 조인 가능.

**Redis 7**
- 대시보드 집계 캐시(생산현황 등 무거운 쿼리), 실시간 설비 상태 Pub/Sub, IoT 수집 버퍼(Streams), JWT Refresh 세션 저장.

**LangChain/LangGraph + pgvector**
- 입고/출하 AI Agent는 사내 품질기준·작업표준 문서를 근거로 판단해야 하므로 RAG가 필요하다. 별도 벡터DB 도입 대신 pgvector로 PostgreSQL에 통합해 운영 부담을 줄인다.
- 통합 AI Agent는 여러 도메인 에이전트를 조율하는 상태 기반 워크플로우가 필요 → LangGraph.

**XGBoost (가열 최적화)**
- 가열로 목표온도/유지시간/장입량 등 정형 피처 기반 회귀이므로, 딥러닝보다 XGBoost가 데이터 효율·해석성(feature importance)·운영 용이성에서 우월하다. 현장 신뢰 확보에 SHAP 해석이 유리.

---

## 2. 시스템 아키텍처 다이어그램

```
                            ┌──────────────────────────────────────────┐
                            │           Client (Browser / Tablet)        │
                            │   관리자 · 공정담당 · 품질담당 · 조회전용     │
                            └───────────────────────┬────────────────────┘
                                                    │ HTTPS
                                                    ▼
                            ┌──────────────────────────────────────────┐
                            │        Next.js 14 (App Router, RSC)         │
                            │   - 대시보드/모듈 UI  - BFF (route handler) │
                            └───────────────────────┬────────────────────┘
                                                    │ REST /api/v1/*
                                                    ▼
                            ┌──────────────────────────────────────────┐
                            │       API Gateway (Express middleware)      │
                            │  JWT 검증 · RBAC · Rate Limit · 감사로그     │
                            └───────┬───────────────────────────┬────────┘
                                    │                            │
                  ┌─────────────────┘                            └──────────────────┐
                  ▼                                                                  ▼
   ┌────────────────────────────────┐                          ┌───────────────────────────────────┐
   │   Core API Service (Node.js)    │   internal REST (mTLS)   │   AI Service (Python FastAPI)        │
   │  ┌──────────────────────────┐   │ ◄──────────────────────► │  ┌─────────────────────────────┐    │
   │  │ Incoming / Heating /      │  │                          │  │ Incoming AI Agent (RAG)      │    │
   │  │ Process / Quality /       │  │                          │  │ Shipping AI Agent (RAG)      │    │
   │  │ Shipping / KPI / Master / │  │                          │  │ Integrated Agent (LangGraph) │    │
   │  │ Admin / Dashboard         │  │                          │  │ Heating Optimizer (XGBoost)  │    │
   │  └──────────────────────────┘   │                          │  └─────────────────────────────┘    │
   └───────┬──────────────┬──────────┘                          └──────────┬───────────────┬──────────┘
           │              │                                                 │               │
           ▼              ▼                                                 ▼               ▼
   ┌──────────────┐ ┌───────────┐                              ┌────────────────┐ ┌────────────────┐
   │ PostgreSQL16 │ │  Redis 7  │                              │  pgvector       │ │ Model Registry │
   │ + TimescaleDB│ │ cache/pub │                              │ (RAG 임베딩)    │ │ (S3/MinIO)     │
   └──────┬───────┘ └─────┬─────┘                              └────────────────┘ └────────────────┘
          ▲               ▲
          │               │ Pub/Sub (실시간 설비상태)
          │        ┌──────┴───────────────────────────────────────────┐
          │        │            IoT 데이터 수집 파이프라인               │
          │        │                                                    │
   ┌──────┴────────┴───┐   MQTT/OPC-UA   ┌──────────────┐  Redis Streams ┌─────────────────┐
   │  Gasworks/Furnace │ ───────────────►│  Edge Gateway │ ──────────────►│ Ingestion Worker │
   │  PLC/Sensors      │   (현장 설비)    │ (수집/정규화) │  XADD          │ (Node/Python)    │
   └───────────────────┘                 └──────────────┘                └────────┬─────────┘
                                                                                   │ batch insert
                                                                                   ▼
                                                                          equipment_sensor_data
                                                                          (TimescaleDB hypertable)
```

**핵심 분리 원칙**
- AI Service는 Core API와 물리 분리 → 추론 부하 격리, 독립 스케일링.
- IoT 수집은 Edge Gateway → Redis Streams 버퍼 → Ingestion Worker → TimescaleDB 배치 적재. 센서 폭주가 OLTP를 막지 않도록 백프레셔를 큐로 흡수.
- 실시간 설비상태는 Worker가 Redis Pub/Sub로 발행 → Next.js가 SSE로 클라이언트에 전달.

---

## 3. 데이터 모델 (핵심 엔티티)

> 공통 규칙: 컬럼 snake_case, PK는 `id BIGSERIAL` 또는 `UUID`, 모든 트랜잭션 테이블은 `created_at / updated_at TIMESTAMPTZ`, 컴플라이언스 대상은 soft delete(`deleted_at TIMESTAMPTZ`). 모든 AI 산출물 테이블은 `confidence` 필드 포함.

### 3.1 suppliers (공급사)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | BIGSERIAL | PK |
| supplier_code | VARCHAR(30) | UNIQUE, NOT NULL |
| name | VARCHAR(200) | NOT NULL |
| country | VARCHAR(50) | |
| quality_grade | VARCHAR(10) | CHECK in ('A','B','C') |
| avg_defect_rate | NUMERIC(5,4) | DEFAULT 0 (집계 캐시) |
| is_active | BOOLEAN | DEFAULT true |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| deleted_at | TIMESTAMPTZ | NULL |

인덱스: `UNIQUE(supplier_code)`, `idx_suppliers_grade(quality_grade)`

### 3.2 raw_materials (원자재 / 입고)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | BIGSERIAL | PK |
| material_lot_no | VARCHAR(50) | UNIQUE, NOT NULL — 입고 LOT |
| supplier_id | BIGINT | FK → suppliers(id), NOT NULL |
| material_type | VARCHAR(50) | NOT NULL (예: SCM440, S45C) |
| heat_no_supplier | VARCHAR(50) | 공급사 제강 Heat No. (성적서) |
| weight_kg | NUMERIC(12,2) | NOT NULL |
| chemical_composition | JSONB | C/Si/Mn/P/S 등 성분비 |
| mill_cert_url | TEXT | 밀시트(성적서) 파일 |
| received_at | TIMESTAMPTZ | NOT NULL |
| inspection_status | VARCHAR(20) | CHECK in ('pending','passed','rejected') |
| ai_judgement | JSONB | 입고 AI Agent 판단 결과 |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

인덱스: `UNIQUE(material_lot_no)`, `idx_rm_supplier(supplier_id)`, `idx_rm_received(received_at)`, `GIN(chemical_composition)`

### 3.3 heats (Heat No. — 핵심 트레이서빌리티)

용해/배합 단위. 사내 Heat No.를 키로 원자재 → 제조 흐름의 시작점.

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | BIGSERIAL | PK |
| heat_no | VARCHAR(50) | UNIQUE, NOT NULL — 사내 Heat No. |
| material_type | VARCHAR(50) | NOT NULL |
| target_composition | JSONB | 목표 성분 |
| actual_composition | JSONB | 실측 성분 |
| total_weight_kg | NUMERIC(12,2) | |
| charged_at | TIMESTAMPTZ | 배합 일시 |
| status | VARCHAR(20) | CHECK in ('open','closed') |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

인덱스: `UNIQUE(heat_no)`, `idx_heats_material(material_type)`

### 3.4 heat_materials (Heat ↔ 원자재 배합 N:M)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | BIGSERIAL | PK |
| heat_id | BIGINT | FK → heats(id), NOT NULL |
| raw_material_id | BIGINT | FK → raw_materials(id), NOT NULL |
| charge_weight_kg | NUMERIC(12,2) | NOT NULL — 투입량 |

인덱스: `UNIQUE(heat_id, raw_material_id)`, `idx_hm_rm(raw_material_id)`
> 역방향 추적: 불량 LOT → heat → heat_materials → raw_materials → suppliers 로 공급사까지 추적.

### 3.5 lots (LOT 번호, heat 연결)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | BIGSERIAL | PK |
| lot_no | VARCHAR(50) | UNIQUE, NOT NULL |
| heat_id | BIGINT | FK → heats(id), NOT NULL |
| parent_lot_id | BIGINT | FK → lots(id), NULL — 분할/병합 추적 |
| product_code | VARCHAR(50) | NOT NULL |
| quantity | INTEGER | NOT NULL DEFAULT 1 |
| current_stage | VARCHAR(20) | CHECK in ('incoming','heating','forging','heat_treatment','inspection','shipped') |
| status | VARCHAR(20) | CHECK in ('active','hold','scrapped','shipped') |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

인덱스: `UNIQUE(lot_no)`, `idx_lots_heat(heat_id)`, `idx_lots_stage(current_stage)`

### 3.6 lot_lineage (LOT 계보 — Closure Table)

LOT 분할/병합/재작업 전수 추적을 위한 Closure Table (CLAUDE.md 규약 준수).

| 컬럼 | 타입 | 제약 |
|------|------|------|
| ancestor_id | BIGINT | FK → lots(id), NOT NULL |
| descendant_id | BIGINT | FK → lots(id), NOT NULL |
| depth | INTEGER | NOT NULL — 0=self |

인덱스: `PRIMARY KEY(ancestor_id, descendant_id)`, `idx_lineage_desc(descendant_id)`
> 임의 깊이의 정/역방향 계보를 단일 인덱스 조회로 추적.

### 3.7 heating_recipes (가열 레시피 / 작업조건)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | BIGSERIAL | PK |
| recipe_code | VARCHAR(30) | UNIQUE, NOT NULL |
| material_type | VARCHAR(50) | NOT NULL |
| target_temp_c | NUMERIC(6,1) | NOT NULL |
| ramp_rate_c_min | NUMERIC(6,2) | 승온속도 |
| soak_time_min | INTEGER | 유지시간 |
| max_charge_kg | NUMERIC(12,2) | |
| version | INTEGER | NOT NULL DEFAULT 1 |
| is_active | BOOLEAN | DEFAULT true |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

인덱스: `UNIQUE(recipe_code, version)`, `idx_recipe_material(material_type)`

### 3.8 heating_processes (가열공정 실적)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | BIGSERIAL | PK |
| lot_id | BIGINT | FK → lots(id), NOT NULL |
| equipment_id | BIGINT | FK → equipment(id), NOT NULL — 가열로 |
| recipe_id | BIGINT | FK → heating_recipes(id), NOT NULL |
| started_at | TIMESTAMPTZ | NOT NULL |
| ended_at | TIMESTAMPTZ | NULL |
| actual_max_temp_c | NUMERIC(6,1) | |
| actual_soak_time_min | INTEGER | |
| energy_kwh | NUMERIC(12,2) | 에너지 소비 |
| ai_optimization | JSONB | 가열최적화 ML 권고/결과 |
| operator_id | BIGINT | FK → users(id) |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

인덱스: `idx_hp_lot(lot_id)`, `idx_hp_equip(equipment_id)`, `idx_hp_started(started_at)`

### 3.9 process_results (공정 실적 — 단조/열처리 등 범용)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | BIGSERIAL | PK |
| lot_id | BIGINT | FK → lots(id), NOT NULL |
| process_type | VARCHAR(30) | CHECK in ('forging','heat_treatment','machining') |
| equipment_id | BIGINT | FK → equipment(id) |
| work_order_no | VARCHAR(50) | |
| parameters | JSONB | 공정 조건 실적 |
| result_status | VARCHAR(20) | CHECK in ('ok','ng','rework') |
| started_at / ended_at | TIMESTAMPTZ | |
| operator_id | BIGINT | FK → users(id) |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

인덱스: `idx_pr_lot(lot_id)`, `idx_pr_type(process_type)`, `idx_pr_started(started_at)`

### 3.10 quality_inspections (검사 결과)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | BIGSERIAL | PK |
| lot_id | BIGINT | FK → lots(id), NOT NULL |
| inspection_type | VARCHAR(30) | CHECK in ('dimension','ut','mt','hardness','tensile','visual') |
| spec_id | BIGINT | FK → quality_specs(id) |
| measured_values | JSONB | 측정값 |
| result | VARCHAR(20) | CHECK in ('pass','fail','conditional') |
| defect_codes | TEXT[] | 불량 코드 |
| ai_anomaly_score | NUMERIC(5,4) | AI 이상탐지 점수 |
| inspector_id | BIGINT | FK → users(id) |
| inspected_at | TIMESTAMPTZ | NOT NULL |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

인덱스: `idx_qi_lot(lot_id)`, `idx_qi_result(result)`, `idx_qi_inspected(inspected_at)`

### 3.11 shipments (출하)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | BIGSERIAL | PK |
| shipment_no | VARCHAR(50) | UNIQUE, NOT NULL |
| lot_id | BIGINT | FK → lots(id), NOT NULL |
| customer_code | VARCHAR(50) | NOT NULL |
| quantity | INTEGER | NOT NULL |
| ship_status | VARCHAR(20) | CHECK in ('ready','approved','shipped','held') |
| ai_judgement | JSONB | 출하 AI Agent 판단(근거 포함) |
| ai_confidence | NUMERIC(5,4) | |
| approved_by | BIGINT | FK → users(id) |
| shipped_at | TIMESTAMPTZ | NULL |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

인덱스: `UNIQUE(shipment_no)`, `idx_ship_lot(lot_id)`, `idx_ship_status(ship_status)`

### 3.12 equipment (설비)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | BIGSERIAL | PK |
| equipment_code | VARCHAR(30) | UNIQUE, NOT NULL |
| name | VARCHAR(200) | NOT NULL |
| type | VARCHAR(30) | CHECK in ('furnace','press','heat_treat','inspection') |
| status | VARCHAR(20) | CHECK in ('running','idle','down','maintenance') |
| location | VARCHAR(100) | |
| spec | JSONB | 정격용량/온도범위 등 |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

인덱스: `UNIQUE(equipment_code)`, `idx_equip_type(type)`, `idx_equip_status(status)`

### 3.13 equipment_sensor_data (TimescaleDB Hypertable)

```sql
CREATE TABLE equipment_sensor_data (
  ts            TIMESTAMPTZ   NOT NULL,
  equipment_id  BIGINT        NOT NULL REFERENCES equipment(id),
  sensor_key    VARCHAR(50)   NOT NULL,   -- temp, pressure, vibration ...
  value         DOUBLE PRECISION NOT NULL,
  quality_flag  SMALLINT      DEFAULT 0   -- 0=good, 1=suspect, 2=bad
);
SELECT create_hypertable('equipment_sensor_data', 'ts',
  chunk_time_interval => INTERVAL '1 day');
CREATE INDEX idx_sensor_equip_ts ON equipment_sensor_data (equipment_id, sensor_key, ts DESC);

-- 연속 집계(1분 평균) — 대시보드/ML 피처용
CREATE MATERIALIZED VIEW sensor_1min
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 minute', ts) AS bucket,
       equipment_id, sensor_key,
       avg(value) AS avg_v, max(value) AS max_v, min(value) AS min_v
FROM equipment_sensor_data
GROUP BY bucket, equipment_id, sensor_key;
```
보존정책: 원시 데이터 90일 후 압축, 1년 후 삭제(집계는 영구 보존).

### 3.14 kpi_daily_snapshots (KPI 일일 집계)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | BIGSERIAL | PK |
| snapshot_date | DATE | NOT NULL |
| kpi_type | VARCHAR(30) | CHECK in ('productivity','quality','utilization') |
| metric_key | VARCHAR(50) | NOT NULL (예: oee, defect_rate, throughput) |
| value | NUMERIC(14,4) | NOT NULL |
| target_value | NUMERIC(14,4) | KPI 목표 |
| dimension | JSONB | 설비/공정/공급사별 분해 |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

인덱스: `UNIQUE(snapshot_date, kpi_type, metric_key)`, `idx_kpi_date(snapshot_date)`

### 3.15 ai_agent_sessions (AI Agent 세션 / 질의이력)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | UUID | PK DEFAULT gen_random_uuid() |
| user_id | BIGINT | FK → users(id), NOT NULL |
| agent_type | VARCHAR(30) | CHECK in ('incoming','shipping','integrated','heating_opt') |
| question | TEXT | 자연어 질의 |
| answer | TEXT | 응답 |
| reasoning | JSONB | LangGraph 노드 추론 trace |
| sources | JSONB | RAG 근거 문서 |
| confidence | NUMERIC(5,4) | AI 신뢰도 (필수) |
| tokens_used | INTEGER | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

인덱스: `idx_ai_user(user_id)`, `idx_ai_type(agent_type)`, `idx_ai_created(created_at)`

### 3.16 RBAC — users / roles / permissions / role_permissions / user_roles

```
users (id PK, email UNIQUE, password_hash, name, department, is_active, last_login_at,
       created_at, updated_at, deleted_at)
roles (id PK, role_code UNIQUE, name, description)
permissions (id PK, perm_code UNIQUE,  -- 예: incoming:read, shipping:approve
             resource VARCHAR, action VARCHAR)
user_roles (user_id FK, role_id FK, PRIMARY KEY(user_id, role_id))
role_permissions (role_id FK, permission_id FK, PRIMARY KEY(role_id, permission_id))
audit_logs (id PK, user_id FK, action, resource, resource_id,
            ip_address, payload JSONB, created_at)  -- 감사 로그
```
인덱스: `UNIQUE(users.email)`, `idx_audit_user_created(user_id, created_at)`, `idx_audit_resource(resource, resource_id)`

### 3.17 ERD 요약 (관계)

```
suppliers 1───* raw_materials *───* heats (via heat_materials) 1───* lots
                                                                   │
   lots 1───* lot_lineage(closure)                                 │
   lots 1───* heating_processes *───1 heating_recipes              │
   lots 1───* process_results                                      │
   lots 1───* quality_inspections *───1 quality_specs              │
   lots 1───* shipments                                            │
   equipment 1───* heating_processes / process_results / equipment_sensor_data
   users *───* roles *───* permissions
```

---

## 4. API 구조 설계 (RESTful, kebab-case 복수형)

> 공통: `Authorization: Bearer <JWT>`, 페이지네이션 `?page=&size=`, 정렬 `?sort=field,desc`, 응답 `{ data, meta }`. 에러 `{ error: { code, message, details } }`.

### 4.1 /api/v1/dashboard
| Method | Path | 설명 |
|--------|------|------|
| GET | /dashboard/production-status | 생산현황 분석 |
| GET | /dashboard/quality-status | 품질현황 분석 |
| GET | /dashboard/equipment-status | 설비상태 모니터링(실시간) |
| GET | /dashboard/shipping-status | 출하현황 분석 |
| GET | /dashboard/summary | KPI 종합 요약 |

### 4.2 /api/v1/incoming (입고배합)
| Method | Path | 설명 |
|--------|------|------|
| GET/POST | /incoming/raw-materials | 입고 조회/등록 |
| GET | /incoming/raw-materials/{id} | 원자재 상세 |
| GET | /incoming/raw-materials/{id}/lineage | 원자재 이력추적 |
| GET/POST | /incoming/heats | Heat 조회/배합등록 |
| GET | /incoming/heats/{heatNo}/materials | Heat 배합 구성 |
| GET | /incoming/suppliers/{id}/quality | 공급처 품질분석 |
| POST | /incoming/ai-judgement | 입고 AI Agent 판단 요청 |

### 4.3 /api/v1/heating (가열공정)
| Method | Path | 설명 |
|--------|------|------|
| GET/POST | /heating/processes | 가열공정 실적 조회/등록 |
| GET | /heating/processes/{id}/monitoring | 가열 데이터 모니터링(시계열) |
| GET/POST/PUT | /heating/recipes | 작업조건(레시피) 관리 |
| GET | /heating/processes/history | 공정 이력 조회 |
| GET | /heating/analysis | 공정데이터 분석 |
| POST | /heating/ai-optimization | 가열 최적화 ML 분석 요청 |

### 4.4 /api/v1/shipping (검사출하)
| Method | Path | 설명 |
|--------|------|------|
| GET/POST | /shipping/shipments | 출하 조회/등록 |
| GET | /shipping/shipments/history | 출하 이력조회 |
| POST | /shipping/shipments/{id}/approve | 출하 승인 |
| POST | /shipping/ai-judgement | 출하 AI Agent 판단 요청 |

### 4.5 /api/v1/process (공정관리)
| Method | Path | 설명 |
|--------|------|------|
| GET/POST | /process/results | 공정실적 조회/등록 |
| GET | /process/results/{id}/monitoring | 공정 데이터 모니터링 |
| GET | /process/results/history | 공정 이력조회 |
| GET | /process/analysis | 공정데이터 분석 |
| GET/PUT | /process/work-conditions | 작업조건 관리 |

### 4.6 /api/v1/quality (품질)
| Method | Path | 설명 |
|--------|------|------|
| GET/POST | /quality/inspections | 검사결과 조회/등록 |
| GET | /quality/inspections/{id} | 검사 상세 |
| GET | /quality/defect-analysis | 불량 분석 |

### 4.7 /api/v1/data (데이터관리)
| Method | Path | 설명 |
|--------|------|------|
| GET | /data/integrated | 데이터 통합 조회 |
| GET | /data/visualization | 시각화용 집계 |
| GET | /data/export | 데이터 다운로드(CSV/Excel) |
| GET/POST | /data/ai-training-sets | AI 학습데이터 관리 |

### 4.8 /api/v1/ai-agents (AI Agent)
| Method | Path | 설명 |
|--------|------|------|
| POST | /ai-agents/query | 통합 자연어 질의(LangGraph) |
| GET | /ai-agents/sessions | 질의 이력 조회 |
| GET | /ai-agents/sessions/{id} | 세션 상세(추론 trace) |
| POST | /ai-agents/recommendations | 의사결정 지원/추천 |

### 4.9 /api/v1/kpi
| Method | Path | 설명 |
|--------|------|------|
| GET | /kpi/productivity | 생산성 KPI |
| GET | /kpi/quality | 품질 KPI |
| GET/PUT | /kpi/targets | KPI 목표 관리 |
| GET | /kpi/snapshots | 일일 집계 조회 |

### 4.10 /api/v1/master (기준정보)
| Method | Path | 설명 |
|--------|------|------|
| GET/POST/PUT | /master/quality-specs | 품질기준 관리 |
| GET/POST/PUT | /master/work-standards | 작업표준 관리 |
| GET/POST/PUT | /master/codes | 코드 관리 |

### 4.11 /api/v1/admin (시스템관리)
| Method | Path | 설명 |
|--------|------|------|
| GET/POST/PUT/DELETE | /admin/users | 사용자 관리(RBAC) |
| GET/POST/PUT | /admin/roles | 역할/권한 관리 |
| GET | /admin/audit-logs | 로그 관리(감사) |
| GET/PUT | /admin/notifications | 알림 설정 |
| GET/PUT | /admin/settings | 시스템 설정 |

### 4.12 내부 API (Core ↔ AI Service, mTLS)
| Method | Path | 설명 |
|--------|------|------|
| POST | /internal/ai/incoming-judgement | 입고 판단 |
| POST | /internal/ai/shipping-judgement | 출하 판단 |
| POST | /internal/ai/integrated-query | 통합 질의 |
| POST | /internal/ml/heating-optimize | 가열 최적화 추론 |

---

## 5. AI Agent 아키텍처

### 5.1 입고 AI Agent (RAG 기반 원자재 품질 판단)

```
입력: { raw_material_id, chemical_composition, supplier_id, mill_cert_text }
        │
        ▼
1) Retrieve: pgvector에서 해당 material_type의 품질기준(quality_specs),
             과거 동일 공급사 불량 이력, 작업표준 임베딩 Top-k 검색
2) Reason (LLM): 성분비 vs 규격 비교 + 공급사 품질등급/이력 종합
3) Output:
   { judgement: 'passed'|'rejected'|'review',
     confidence: 0.0~1.0,           # 필수
     reasons: [ ... ],              # 근거 항목
     sources: [ spec_id, history_id ] }  # RAG 출처
```
판단 결과는 `raw_materials.ai_judgement` 및 `ai_agent_sessions`에 기록. `confidence < 0.7`이면 품질담당 review 강제.

### 5.2 출하 AI Agent (검사결과 + 공정데이터 기반 출하 판단)

```
입력: { lot_id }
        │
        ▼
1) Collect: quality_inspections(전 검사 pass 여부), process_results,
            heating_processes 실적, lot_lineage(재작업 여부)
2) Retrieve: 고객별 출하기준/작업표준 RAG
3) Reason (LLM): 검사 누락/조건부 합격/공정 이상 종합 판정
4) Output:
   { ship_decision: 'approved'|'held'|'review',
     confidence,                    # 필수 (shipments.ai_confidence)
     blocking_issues: [ ... ],
     traceability_ok: bool }
```
`held`/`review` 또는 `confidence < 0.8`이면 자동 승인 차단 → 사람 승인(`/shipping/shipments/{id}/approve`) 필요. (제조 출하는 안전 마진 우선)

### 5.3 통합 AI Agent (LangGraph 멀티에이전트 오케스트레이션)

```
                 ┌──────────────┐
   자연어 질의 ─► │  Supervisor   │  의도 분류/라우팅
                 └──────┬───────┘
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
 ┌────────────┐  ┌────────────┐   ┌────────────┐
 │ Production  │  │ Quality     │   │ Equipment   │
 │ Analyst     │  │ Analyst     │   │ Analyst     │
 │ (SQL tool)  │  │ (SQL+RAG)   │   │ (TS query)  │
 └─────┬───────┘  └─────┬──────┘   └─────┬───────┘
       └────────────────┼────────────────┘
                        ▼
                 ┌──────────────┐
                 │ Aggregator    │  결과 종합 + 추천
                 └──────┬───────┘
                        ▼
            { answer, reasoning(trace), sources, confidence }
```
- 각 도메인 에이전트는 **Tool**로 제한된 read-only SQL/TimescaleDB 쿼리만 호출(쓰기 금지).
- LangGraph `StateGraph`로 노드 간 상태(state)를 전달, 전체 trace를 `ai_agent_sessions.reasoning`에 저장.
- 가드레일: SQL 인젝션 방지를 위해 파라미터화 + 화이트리스트 테이블/컬럼만 허용.

### 5.4 가열 최적화 ML (XGBoost)

| 구분 | 스펙 |
|------|------|
| 모델 | XGBoost Regressor (다중 출력: 권장 target_temp, soak_time) |
| 입력 피처 | material_type(원핫), charge_weight_kg, target_hardness, ambient_temp, furnace_id, 직전 batch 잔열, recipe baseline |
| 출력 | { recommended_target_temp_c, recommended_soak_time_min, predicted_energy_kwh, predicted_quality_pass_prob, confidence } |
| 학습 데이터 | heating_processes + quality_inspections 조인 (양품 결과 라벨) |
| 해석 | SHAP value 제공 → 현장 신뢰 확보 |
| 서빙 | FastAPI `/internal/ml/heating-optimize`, 모델 버전은 Model Registry(S3/MinIO)에서 로드 |
| 재학습 | 주기적 배치(주 1회) + 신규 양품 데이터 누적 시 트리거 |

---

## 6. 폴더 구조 (Monorepo)

```
TaeWoong-AI-MES/
├── apps/
│   ├── web/                     # Next.js 14 (App Router)
│   │   ├── app/
│   │   │   ├── (dashboard)/     # AI 대시보드
│   │   │   ├── incoming/        # 입고배합관리
│   │   │   ├── heating/         # 가열공정관리
│   │   │   ├── shipping/        # 검사출하관리
│   │   │   ├── process/         # 공정관리
│   │   │   ├── quality/         # 품질
│   │   │   ├── data/            # 데이터관리
│   │   │   ├── ai-agents/       # AI Agent 통합
│   │   │   ├── kpi/             # KPI 관리
│   │   │   ├── master/          # 기준정보
│   │   │   └── admin/           # 사용자/시스템
│   │   └── lib/                 # api client, hooks
│   ├── api/                     # Node.js Express (Core)
│   │   └── src/
│   │       ├── modules/         # 도메인별 (incoming, heating, ...)
│   │       │   └── <domain>/
│   │       │       ├── *.controller.ts
│   │       │       ├── *.service.ts
│   │       │       └── *.repository.ts
│   │       ├── middleware/      # auth, rbac, rate-limit, audit
│   │       ├── db/              # drizzle/prisma schema, migrations
│   │       └── server.ts
│   └── ai-service/              # Python FastAPI
│       └── app/
│           ├── api/             # routers (internal)
│           ├── agents/          # incoming, shipping, integrated (LangGraph)
│           ├── ml/              # heating optimizer (XGBoost)
│           ├── rag/             # pgvector retriever
│           ├── domain/          # entities, repo interfaces (ABC)
│           └── infrastructure/  # repo impl, db, cache
├── packages/
│   ├── ui/                      # shadcn/ui 공통 컴포넌트
│   ├── types/                   # 공유 TS 타입 (API DTO, enums)
│   └── utils/                   # 공통 유틸 (date, format, validation)
├── infra/
│   ├── docker/                  # Dockerfile.web/api/ai
│   └── k8s/                     # base/ + overlays/ (선택)
├── docs/
│   ├── 00-requirement/
│   ├── 01-development/
│   ├── 02-design/               # ← 본 문서
│   ├── 03-refactoring/
│   └── 04-operation/
├── scripts/
│   └── init-db.sql              # DB 스키마 SoR
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── CLAUDE.md
```

---

## 7. 개발 환경 설정

### 7.1 pnpm-workspace.yaml
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 7.2 docker-compose.yml (구조)
```yaml
services:
  postgres:           # PostgreSQL 16 + TimescaleDB + pgvector
    image: timescale/timescaledb-ha:pg16
    environment: [POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD]
    volumes: ['./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql', 'pgdata:/var/lib/postgresql/data']
    ports: ['5432:5432']
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
  api:                # Node.js Express
    build: { context: ., dockerfile: infra/docker/Dockerfile.api }
    depends_on: [postgres, redis]
    env_file: .env
    ports: ['4000:4000']
  ai-service:         # Python FastAPI
    build: { context: ., dockerfile: infra/docker/Dockerfile.ai }
    depends_on: [postgres, redis]
    env_file: .env
    ports: ['8000:8000']
  web:                # Next.js
    build: { context: ., dockerfile: infra/docker/Dockerfile.web }
    depends_on: [api]
    ports: ['3000:3000']
volumes: { pgdata: {} }
```

### 7.3 환경변수 목록
| 변수 | 설명 |
|------|------|
| DATABASE_URL | PostgreSQL 연결 (postgres://...) |
| REDIS_URL | Redis 연결 |
| JWT_SECRET / JWT_REFRESH_SECRET | 토큰 서명 키 |
| JWT_ACCESS_TTL / JWT_REFRESH_TTL | 만료(15m / 7d) |
| AI_SERVICE_URL | Core → AI 내부 호출 URL |
| INTERNAL_API_TOKEN | 서비스 간 인증 토큰 |
| OPENAI_API_KEY (또는 LLM_ENDPOINT) | LLM 키 |
| EMBEDDING_MODEL | RAG 임베딩 모델 |
| MODEL_REGISTRY_URL | XGBoost 모델 스토리지(S3/MinIO) |
| RATE_LIMIT_WINDOW / RATE_LIMIT_MAX | Rate Limit 설정 |
| MQTT_BROKER_URL | IoT Edge Gateway 브로커 |
| NEXT_PUBLIC_API_BASE_URL | 프론트 API 베이스 |

---

## 8. 보안 설계

### 8.1 인증 — JWT + Refresh Token
```
로그인 → Access Token(15m, 메모리/헤더) + Refresh Token(7d, httpOnly Secure 쿠키)
Access 만료 → /api/v1/auth/refresh → Refresh 검증(Redis 화이트리스트) → 신규 Access 발급
로그아웃 → Redis에서 Refresh 무효화(블랙리스트)
```
- Access Token은 stateless 검증, Refresh Token은 Redis에 저장하여 강제 만료/회수 가능.
- 비밀번호는 bcrypt/argon2 해시.

### 8.2 RBAC 권한 매트릭스

| 리소스/액션 | 관리자 | 공정담당 | 품질담당 | 조회전용 |
|-------------|:------:|:--------:|:--------:|:--------:|
| dashboard:read | ✅ | ✅ | ✅ | ✅ |
| incoming:read | ✅ | ✅ | ✅ | ✅ |
| incoming:write | ✅ | ✅ | ❌ | ❌ |
| incoming:ai-judge | ✅ | ✅ | ✅ | ❌ |
| heating:read | ✅ | ✅ | ✅ | ✅ |
| heating:write | ✅ | ✅ | ❌ | ❌ |
| process:write | ✅ | ✅ | ❌ | ❌ |
| quality:read | ✅ | ✅ | ✅ | ✅ |
| quality:write | ✅ | ❌ | ✅ | ❌ |
| shipping:write | ✅ | ✅ | ❌ | ❌ |
| shipping:approve | ✅ | ❌ | ✅ | ❌ |
| master:write | ✅ | ❌ | ✅(품질기준) | ❌ |
| kpi:targets:write | ✅ | ❌ | ❌ | ❌ |
| admin:* | ✅ | ❌ | ❌ | ❌ |
| ai-agents:query | ✅ | ✅ | ✅ | ✅ |

> 권한은 `permissions.perm_code`(`resource:action`)로 정의하고, 미들웨어 `requirePermission('shipping:approve')`로 강제. 출하 승인과 품질 등록은 공정담당과 분리(직무 분리 원칙).

### 8.3 API Rate Limiting
- Redis 기반 sliding window. 기본: 사용자당 100 req/min, AI 질의 엔드포인트(`/ai-agents/*`, `*/ai-*`)는 10 req/min(추론 비용 보호).
- 초과 시 `429 Too Many Requests` + `Retry-After`.

### 8.4 감사 로그
- 쓰기/승인/권한변경/출하승인 등 민감 액션은 `audit_logs`에 `user_id, action, resource, resource_id, ip_address, payload` 기록.
- 미들웨어 자동 기록(write/approve 메서드 후크) + 변경 불가(append-only) 운영.
- 트레이서빌리티/컴플라이언스 대응: 모든 LOT/Heat/출하 변경은 감사 로그와 soft delete로 추적 가능.

### 8.5 기타
- 서비스 간 통신 mTLS + `INTERNAL_API_TOKEN`(Core ↔ AI).
- 시크릿은 환경변수/Secrets Manager에서 주입(하드코딩 금지).
- DB는 private subnet, 외부 노출 금지.
- AI Agent SQL Tool은 read-only role + 화이트리스트 테이블만 허용(쓰기·DDL 차단).

---

## 9. 비기능 요구 / 운영 고려

| 항목 | 전략 |
|------|------|
| 가용성 | API/AI 서비스 무상태 → 수평 확장. DB는 read replica 분리(대시보드 조회 부하). |
| 성능 | 대시보드 집계는 Redis 캐시(TTL 30~60s) + TimescaleDB 연속집계. |
| 확장성 | AI 서비스 독립 스케일링(추론 부하 격리). IoT는 큐로 백프레셔 흡수. |
| 배포 | 로컬 Docker Compose → (선택) EKS + ArgoCD. Blue/Green 권장(출하 무중단). |
| 관측성 | 구조화 JSON 로그, Prometheus 메트릭, Grafana(설비/처리량/지연). |

---

## 부록 A. SoR(Source of Truth) 우선순위
1. `scripts/init-db.sql` — DB 스키마 정본
2. `apps/*/` 구현 코드
3. `packages/types` — 공유 타입 정본
4. 본 설계 문서 — 설계 의도 (코드와 충돌 시 코드 우선)
