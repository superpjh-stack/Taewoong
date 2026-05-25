# QA 분석 결과 — 검사출하관리 & AI Agent

## 분석 대상
- 경로: `apps/web/app/(protected)/{shipments,quality,ai-agent}/page.tsx`, `apps/api/src/routes/{shipments,ai-agents,quality}.ts`
- 추가 추적 파일: 컨트롤러 3종, 서비스 4종(API/Web), Zod 스키마, 도메인 타입, 공통 응답 헬퍼
- 파일 수: 13개 (라우트 6 + 의존 파일 7)
- 분석일: 2026-05-21
- 분석자: bkit-code-analyzer (QA)

## 품질 점수: 74/100

라우트/컨트롤러/페이지의 구조와 명명 규칙은 우수하나, **(1) AI 비동기 에러 처리 누락, (2) confidence_score 계약 불일치, (3) 출하 상태 전환 검증 부재** 3가지가 점수를 끌어내림. 신규 페이지 착수 전 선결 필요.

---

## 1. 기존 코드 이슈

### 🔴 Critical (즉시 수정)

| 파일 | 위치 | 이슈 | 권고 조치 |
|------|------|------|-----------|
| `apps/api/src/controllers/*.ts` 전반 | shipment/quality `list`,`getById`,`create`,`update`,`approve` | **비동기 에러 미처리.** 컨트롤러가 bare `async`인데 `asyncHandler` 래퍼가 없음(`grep asyncHandler` → 0건). 서비스에서 던진 reject(DB 오류 등)가 `errorHandler`로 전달되지 않고 unhandled rejection → 요청 행(hang). | `asyncHandler(fn)` 래퍼 도입 후 모든 라우트에 적용, 또는 컨트롤러에 `try/catch`+`next(err)` |
| `apps/api/src/services/shipment-service.ts` | `approveShipment` 77-89 | **상태 전환 검증 없음.** `ship_status` 현재값 무관하게 무조건 `'approved'`로 UPDATE. `shipped`/`cancelled`/`held` 건도 재승인 가능 → 상태 머신 위반. CLAUDE.md "LOT 상태 변경은 이벤트 기반" 원칙 위배. | `WHERE ... AND ship_status = 'ready'` 추가, 0행이면 409 CONFLICT 반환. 허용 전이표(ready→approved→shipped, *→held/cancelled) 정의 |
| `apps/web/lib/services/ai-service.ts` / `apps/api/.../ai-service.ts` | Web 12-18 vs API 8(`Promise<unknown>`) | **confidence_score 계약 불일치.** 웹은 `AiAgentResponse.confidence_score: number`(필수)로 단언하나, API `queryAiAgent`는 `unknown` 반환이며 외부 AI 서비스 JSON을 검증 없이 그대로 전달. 외부 응답에 `confidence_score`가 없거나 문자열이면 런타임에 UI `AiConfidenceBar score={...}` 깨짐. | API 측에서 Zod로 AI 응답 파싱 후 `confidence_score` 보장(누락 시 기본 0 또는 503). §confidence_score 검증 결과 참조 |

### 🟡 Warning (개선 권고)

| 파일 | 위치 | 이슈 | 권고 조치 |
|------|------|------|-----------|
| `apps/api/src/lib/response.ts` | `errorHandler` 59-60 | **에러 메시지 노출.** 잡힌 모든 에러의 `err.message`를 그대로 500 응답에 실음 → DB/스택 정보 누출 가능(OWASP 민감정보 노출). | 프로덕션에서는 고정 메시지 반환, 상세는 서버 로그로만 |
| `apps/api/src/controllers/quality-controller.ts` | `list` 6-13 | **list 쿼리 검증 부재.** shipment.list는 `shipmentFilterSchema.safeParse`로 검증하나 quality.list/ai listSessions는 `Number(req.query[...])` 직접 변환. `?page=abc` → `NaN` → OFFSET 계산 오류. | `paginationSchema.safeParse(req.query)` 적용해 일관성 확보 |
| `apps/api/src/controllers/ai-agent-controller.ts` | `listSessions` 21-22 | 동일 — `Number(... ?? 1)` 무검증. `NaN` 가드 없음. | 위와 동일 |
| `apps/api/src/services/quality-service.ts` | `createInspection` 47-55, `updateJudgement` 58-76 | **상태 전환 검증 없음.** 이미 `passed`/`failed`인 검사도 재판정 가능(`WHERE`에 `insp_status` 조건 없음). `data: Record<string, unknown>`로 받아 타입 안전성 상실(컨트롤러에서 Zod 통과하지만 서비스 시그니처가 느슨). | `WHERE ... AND insp_status='pending'` 추가, 서비스 인자를 `CreateQualityInspectionDto` 타입으로 |
| `apps/web/lib/services/shipment-service.ts` | `Shipment` 14 | `[key: string]: unknown` 인덱스 시그니처로 인해 오타 속성 접근이 컴파일 타임에 안 잡힘. 타입 안전성 약화. | 인덱스 시그니처 제거하고 명시 필드만 유지 |
| `apps/web/app/(protected)/ai-agent/page.tsx` | `msgId` 30 | 모듈 전역 가변 `let msgId` — 동일 모듈 다중 마운트 시 ID 충돌·메모리 누수 소지. | `useRef(0)` 또는 `crypto.randomUUID()` |
| `apps/api/src/services/ai-service.ts` | 31-33 | 세션 저장 시 `answer: JSON.stringify(result)` — 외부 AI 응답 원본을 그대로 저장(검증 전). 또한 `.catch(()=>{})`로 실패를 완전 무시 → 감사 추적 누락 가능. | 검증된 결과 저장 + 실패는 최소 로깅 |

### 🟢 Info (참고)

- 명명 규칙(camelCase 함수, PascalCase 컴포넌트, UPPER_SNAKE 상수) 전반 양호.
- 라우트 계층(API→Controller→Service→DB) 분리와 RBAC `requirePermission` 적용 일관됨.
- SQL은 `postgres` 태그드 템플릿(파라미터 바인딩) 사용 → SQL Injection 방어 양호.
- 응답 포맷 `{success, data}` / `{success, error:{code,message}}` 표준 준수. 단, CLAUDE.md/Phase4 예시의 `{data, meta}` 래핑과는 키 차이 있음(`success` 플래그 방식) — 팀 표준이면 무방.
- AI 입력 검증: `aiQuerySchema`로 `question` 1~2000자, `agent_type` enum, `session_id` UUID 검증 → 입력값 검증 양호. 프롬프트 인젝션 방어는 AI 서비스(FastAPI) 측 책임으로 별도 확인 필요.
- 출하 라우트에 Rate Limiting 미적용 — Phase 7에서 AI/쓰기 엔드포인트에 적용 권고.

---

## 2. confidence_score 필드 검증 결과 (CLAUDE.md 요구사항)

> CLAUDE.md: "모든 AI 예측은 confidence score 필드를 포함해야 한다"

| 영역 | 필드명 | 위치 | 준수 여부 | 비고 |
|------|--------|------|-----------|------|
| AI Agent 응답(Web) | `confidence_score: number` | `web/lib/services/ai-service.ts:14` | ✅ 타입상 존재(필수) | UI `AiConfidenceBar`에서 렌더 |
| AI Agent 응답(API) | — | `api/.../ai-service.ts:8` 반환 `unknown` | ⚠️ **계약 미보장** | 외부 AI JSON 무검증 통과. confidence_score 누락 시 탐지 불가 |
| 품질검사 AI 점수 | `ai_anomaly_score: number\|null` | `domain.ts:250` | ⚠️ **명칭 불일치** | 주석에 "C-5: confidence_score 대신 이 필드 사용" 명시 — 의도된 예외. UI quality page는 이 필드 사용(`quality/page.tsx:117`) |
| 출하 AI 판정 | `ai_confidence: number\|null` | `domain.ts:278` | ⚠️ **명칭 불일치** | 의미상 confidence지만 필드명 `ai_confidence`. UI/Zod에 노출 안 됨(미사용) |

### 결론
- **타입 정의 레벨에서는 confidence 필드가 존재**하나, 명칭이 3종(`confidence_score`/`ai_anomaly_score`/`ai_confidence`)으로 분산되어 일관성 결여.
- **가장 큰 리스크는 API→Web 경계의 미검증**: API가 `unknown`을 반환해 confidence_score 존재가 런타임 보장되지 않음. CLAUDE.md 요구사항을 "코드로 강제"하지 못함.
- 권고: ① 공통 `AiPredictionBase { confidence_score: number }` 타입을 `packages/types`에 정의하고 출하/품질/Agent가 공유. ② API 응답 Zod 검증으로 누락 시 503 또는 기본값. ③ 명칭을 `confidence_score`로 통일하거나 도메인 예외(anomaly_score)를 문서화.

---

## 3. 출하 상태 전환 로직 검증

현재 상태 정의: `ready | approved | shipped | held | cancelled` (`domain.ts:265`)

| 전환 경로 | 구현 여부 | 검증 여부 | 문제 |
|-----------|-----------|-----------|------|
| ready → approved | `approveShipment` | ❌ 없음 | 현재 상태 무관하게 강제 UPDATE (Critical) |
| approved → shipped | `updateShipment`(allowed에 `ship_status` 포함) | ❌ 없음 | 임의 상태값 직접 주입 가능 |
| * → held / cancelled | `updateShipment` | ❌ 없음 | 검증 없는 자유 전환 |
| 역전이/재전이 차단 | — | ❌ 없음 | shipped→ready 등 비정상 전이 허용됨 |

- `updateShipment`(service:65-75)는 `ship_status`를 화이트리스트 `allowed`에 포함시켜 **PATCH로 임의 상태 직접 설정 가능** — 상태 머신 우회 경로. `update` 컨트롤러(37-45)는 Zod 검증조차 없이 `req.body`를 그대로 전달.
- 권고: 상태 전이 함수를 분리하고 허용 전이표(transition map)로 검증. PATCH의 `ship_status` 직접 수정은 금지하고 전용 액션 엔드포인트(approve/ship/hold/cancel)로만 변경. CLAUDE.md "이벤트 기반 상태 변경" 원칙과 정합.

---

## 4. 신규 페이지 테스트 체크리스트 (Dev3)

### 공통 (모든 신규 페이지)
- [ ] `'use client'` + 서버 데이터 fetch 시 loading/error/empty 3-상태 처리
- [ ] `ApiError instanceof` 분기로 사용자 친화 메시지 표시(기존 페이지 패턴 준수)
- [ ] 페이지네이션 사용 시 `?page=비정상값` 입력에도 안전(서버 Zod 검증 선결 필요 — §1 Warning)
- [ ] RBAC: 권한 없는 사용자 접근 시 라우트/메뉴 가드 동작
- [ ] 타입: `any` 미사용, 서비스 레이어 통한 호출(UI→Service→ApiClient 3계층)

### /shipments/management (출하 관리)
- [ ] 상태 전이 버튼이 **현재 상태에서 허용된 전이만** 노출(ready→승인만, shipped는 버튼 없음)
- [ ] 승인 후 재승인 시도 시 409/비활성 처리 (서버 §3 수정 의존)
- [ ] PATCH로 `ship_status` 직접 변경 UI 미노출(전용 액션만)
- [ ] 등록 폼: lot_id/quantity 양수, customer_code 필수 검증(클라+서버)

### /shipments/history (출하 이력)
- [ ] 날짜 범위 필터(`from`/`to`) ISO datetime 형식 검증
- [ ] 소프트 삭제(`deleted_at`) 건 제외 확인
- [ ] 상태별/고객사별 필터 조합 동작, 페이지네이션 total 일치

### /shipments/data (출하 데이터)
- [ ] 대량 데이터 렌더 시 N+1 없음(서버 JOIN `lot_no` 1쿼리 확인됨), 가상화/페이지네이션
- [ ] 숫자 포맷(`formatNumber`), 날짜 포맷(`formatDate`) 일관 적용
- [ ] CSV/엑셀 내보내기가 있다면 민감정보(고객 주문번호) 노출 정책 확인

### /shipments/ai-agent (출하 AI)
- [ ] 응답에 **confidence_score 표시**(`AiConfidenceBar`), 누락 시 graceful fallback
- [ ] `agent_type='shipping'` 고정/선택 동작
- [ ] AI 서비스 503 시 사용자 메시지 + 재시도 안내(기존 ai-agent page 패턴)
- [ ] 출하 AI 판정(`ai_judgement`/`ai_confidence`)이 실제 출하 승인과 연동 시 자동승인 권한 검증

### /ai-agent/query (질의)
- [ ] 입력 길이 2000자 제한(서버 Zod와 일치하도록 클라 maxLength)
- [ ] 빈 입력/로딩 중 전송 차단(기존 page.tsx:47 패턴)
- [ ] session_id UUID 형식 — 클라에서 임의 문자열 주입 불가
- [ ] XSS: AI 응답 렌더 시 `whitespace-pre-wrap` 텍스트 출력(현재 안전), `dangerouslySetInnerHTML` 미사용 확인

### /ai-agent/analysis (분석)
- [ ] 분석 결과 차트/지표에 confidence_score 동반 표기
- [ ] 무거운 연산 결과 캐싱(불필요 재요청 방지)

### /ai-agent/decision (의사결정)
- [ ] AI 의사결정이 쓰기 작업(출하승인 등) 트리거 시 **별도 권한 + 사람 확인(confirm) 필수**
- [ ] decision 근거(sources/risks) 표시, confidence 임계값 미만 시 경고

### /ai-agent/alerts (알림)
- [ ] severity(`info/warning/critical`) 매핑 일관(`AlertSeverity` 타입 사용)
- [ ] 실시간 갱신 시 메모리 누수 없음(useEffect cleanup, 폴링/소켓 해제)
- [ ] 알림 폭주 시 그룹핑/페이지네이션

### /ai-agent/history (이력)
- [ ] `listSessions`가 **본인 user_id 건만** 반환 확인(서버 9-45행: `WHERE user_id` 적용됨 ✅) — 타인 세션 접근 불가 테스트
- [ ] 저장된 `answer`(JSON 문자열) 파싱 실패 시 graceful 처리
- [ ] 페이지 쿼리 비정상값 안전(§1 Warning 선결)

---

## 5. 개선 권고사항 (우선순위순)

1. **[Critical] `asyncHandler` 도입** — 모든 컨트롤러를 래핑해 비동기 reject를 `errorHandler`로 전달. 요청 hang/unhandled rejection 제거. 신규 AI 페이지 안정성의 전제.
2. **[Critical] 출하/품질 상태 머신 검증** — `approveShipment`/`updateShipment`/`updateJudgement`에 현재 상태 조건(`WHERE ... AND status=...`) 추가, 0행이면 409 CONFLICT. PATCH의 `ship_status` 직접 수정 제거.
3. **[Critical] AI 응답 계약 강제** — `packages/types`에 `confidence_score` 보장 Zod 스키마 정의, API `queryAiAgent`가 외부 응답을 파싱·검증 후 반환(현 `unknown` 제거). 누락 시 503 또는 기본값.
4. **[Warning] confidence 필드 명칭 통일** — `confidence_score`/`ai_anomaly_score`/`ai_confidence` 정합화 및 도메인 예외 문서화. CLAUDE.md 요구사항 추적성 확보.
5. **[Warning] list 쿼리 파라미터 Zod 검증 일원화** — quality/ai listSessions에 `paginationSchema.safeParse` 적용(NaN/음수 가드).
6. **[Warning] 프로덕션 에러 메시지 마스킹** — `errorHandler`가 `err.message`를 그대로 노출하지 않도록 환경 분기.
7. **[Info] 타입 안전성 강화** — `Shipment` 인덱스 시그니처 제거, 서비스 인자에 DTO 타입 적용(`Record<string,unknown>` 지양), 모듈 전역 `let msgId` 제거.
8. **[Info] AI/쓰기 엔드포인트 Rate Limiting**(Phase 7) — `/ai-agents/query`, 출하 승인에 적용.

---

## 후속 조치 판단
- **Critical 3건 존재 → 배포 차단.** 신규 9개 페이지 착수 전 1·2·3번 선결 권고(특히 상태 머신·AI 계약은 신규 페이지가 직접 의존).
