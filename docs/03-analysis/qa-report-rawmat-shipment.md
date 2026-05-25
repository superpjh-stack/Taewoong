# QA 리포트 — 원자재 + 출하 (Dev Team 4)

## 검증 대상
- 경로: `apps/web/app/(protected)/raw-materials/**`, `apps/web/app/(protected)/shipments/**`
- 서비스: `apps/web/lib/services/raw-material-service.ts`, `shipment-service.ts`, `ai-service.ts`
- 파일 수: 페이지 11개 + 서비스 3개
- 검증일: 2026-05-24

## 품질 점수: 86/100

원자재 모듈은 완성도가 높고, 출하 모듈은 UI/타입 품질은 좋으나 백엔드 미구현 엔드포인트 호출과 비기능 UI 요소가 남아 있음.

---

## 🔴 Critical (즉시 수정 필요)

| 파일 | 위치 | 이슈 | 권장 조치 |
|------|------|------|----------|
| shipments/data/page.tsx | `runDataIntegrityCheck` (정합성 검사 버튼) | 호출 대상 `POST /shipments/data/integrity-check` 가 백엔드에 미구현. 버튼 클릭 시 런타임 에러 → AlertBanner로 실패 표시 | 백엔드 라우트 구현 또는 버튼 임시 비활성화 |
| shipments/ai-agent/page.tsx | `analyzeShipmentEligibility`, `analyzeDueDateRisk` | `POST /ai-agents/shipment-eligibility`, `POST /ai-agents/due-date-risk` 미구현. ai-agents.ts 는 `/query`, `/sessions` 만 존재. 두 "분석 실행" 버튼 모두 실패 | 백엔드 AI 라우트 구현 필요 |

> 백엔드 라우트 검증 기준: `apps/api/src/routes/shipments.ts`, `ai-agents.ts` (2026-05-24 grep).
> 참고: shipments `/history`, `/data`, `/data/summary`, `/due-date-summary`, `/:id/traceability`, `/:id/data` 는 **이미 구현됨** — 출하 이력/데이터 조회·수정 경로는 정상 동작.

---

## 🟡 Warning (개선 권장)

| 파일 | 위치 | 이슈 | 권장 조치 |
|------|------|------|----------|
| shipments/ai-agent/page.tsx | 244-250 (QUICK_QUESTIONS 버튼) | 빠른 질문 버튼의 onClick 핸들러가 비어 있음 (주석으로 인지). `AiChatInterface` 가 외부 input 주입 prop 미지원하여 버튼 클릭 시 아무 동작 안 함 | `AiChatInterface` 에 `initialInput`/`onQuickQuestion` prop 추가 후 연결 |
| raw-materials/ai-agent/page.tsx | `queryAgent` → `AiAgentResponse` | AI 응답이 런타임 검증 없이 사용됨 (서비스가 `confidence_score` 존재를 강제하지 않음). `confidence_score` 미수신 시 ConfidenceBadge 미표시로 조용히 누락 | 서비스 레이어에서 응답 스키마 검증 추가 |
| (전역) ai_confidence 명명 | ai-service vs shipment-service | AI 신뢰도 필드가 `confidence_score`(agent) / `ai_confidence`(shipment 타입) 로 혼재. CLAUDE.md 신뢰도 표시 요건은 충족하나 명명 불일치 | 도메인 간 필드명 통일 검토 |
| 입고/출하 등록 폼 | raw-materials, shipments page.tsx | 공급사/고객사/LOT 를 ID·코드 자유 입력(number/text)으로 받음. 존재하지 않는 ID 입력 가능 | 드롭다운(서버 조회 기반) 또는 자동완성 권장 |

---

## 🟢 Info / 양호 사항

- **formatDate 사용**: 모든 날짜 컬럼이 `formatDate`/`formatDateShort` 사용. raw 문자열 출력 없음. (출하 data 페이지는 날짜 컬럼 미노출이라 미사용 — 정상)
- **재고/오류 강조**: 반려 행(`rgba(255,59,59,0.08)`), 정합성 오류 행, 납기 임박 D-Day 행(`rgba(255,107,53,0.08)`) 모두 색상 강조 구현됨. `DDayBadge` 의 D-Day/초과 분기 양호.
- **AI 신뢰도 표시**: ConfidenceBadge / ConfidenceBar 로 score 시각화. eligibility 카드는 신뢰도 막대 + 근거 리스트 제공.
- **에러 처리**: 모든 페이지가 `ApiError instanceof` 분기 + AlertBanner 패턴 일관 적용. summary 로드 실패는 의도적으로 무시(non-critical) 처리 일관됨.
- **필터 배선**: (이전 발견되었던) `raw-materials/incoming` 의 date/material 필터 미배선 이슈가 **해소됨** — `load()` 가 `date_from`/`date_to`/`material_type` 전달. 검증 대상 6개 리스트 페이지 모두 필터→service 인자 배선 정상.
- **TypeScript**: `any` 미사용, 단따옴표·세미콜론 생략·2칸 들여쓰기 규칙 준수.

---

## 직접 수정한 항목

1. `shipments/data/page.tsx:25` — 사용하지 않는 `formatDateShort` import 제거 (lint/`noUnusedLocals` 오류 방지).
2. `shipments/management/page.tsx:90-109` — 정의만 되고 사용되지 않는 `RowHighlight` 컴포넌트(데드 코드) 제거.

## 후속 권장 (수정 안 함 — 범위 외)

1. Critical 2건(integrity-check, AI eligibility/due-date-risk)은 백엔드 라우트 구현이 선행되어야 함. 프론트는 호출 준비 완료 상태.
2. 빠른 질문 버튼은 `AiChatInterface` API 변경이 필요하여 컴포넌트 소유 팀과 협의 후 처리.

## 배포 판단
- Critical 2건은 **백엔드 미구현**에 기인 (프론트 코드 자체 결함 아님). 해당 버튼이 호출하는 백엔드가 구현되기 전까지 출하 데이터-정합성검사/AI 분석 기능은 비활성으로 간주.
- 프론트엔드 코드 품질 자체는 배포 가능 수준. 백엔드 연동 완료 후 Critical 재검증 필요.
