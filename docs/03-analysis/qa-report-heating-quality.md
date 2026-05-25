# QA Report — 열처리(가열공정) + 품질관리

- 검증 대상 경로: `apps/web/app/(protected)/heating/*`, `apps/web/app/(protected)/quality/page.tsx`
- 연관 서비스/백엔드: `apps/web/lib/services/heating-service.ts`, `quality-service.ts`, `apps/api/src/routes/*`
- 검증일: 2026-05-24
- 검증자: QA Team 3

## 품질 점수: 88/100

전반적으로 타입 안정성, 코딩 규칙(싱글 쿼트/세미콜론 없음), 에러 처리, 빈 상태 처리, °C 단위, confidence_score 표시가 잘 지켜져 있음. 단, 품질관리 판정 모달이 백엔드 라우트와 어긋나 동작하지 않는 Critical 통합 이슈 1건이 있었고 수정함.

## 발견 이슈

### Critical (즉시 수정 필요)

| 파일 | 위치 | 이슈 | 조치 |
|------|------|------|------|
| `apps/web/lib/services/quality-service.ts` | 54 (수정 전) | `updateJudgement`이 `PATCH /quality-inspections/:id/judgement`로 호출하나 백엔드는 `PATCH /:id`만 등록 (`apps/api/src/routes/quality.ts:13`). 2-세그먼트 경로는 `/:id`에 매칭되지 않아 판정 입력 시 항상 404 "검사를 찾을 수 없습니다" 반환 → 합격/불합격 판정 기능 완전 미동작 | **수정 완료**: 서비스 호출 경로를 `PATCH /quality-inspections/:id`로 정렬 (백엔드 구현 라우트에 맞춤) |

검증 근거: `apps/api/src/routes/quality.ts`는 `GET /`, `GET /:id`, `POST /`, `PATCH /:id`만 등록. `quality-controller.updateJudgement`은 `req.params['id']`를 읽으므로 `/:id` 경로에서 정상 동작. 수정 후 판정 모달의 PATCH가 정상 라우팅됨.

### Warning (개선 권장)

| 파일 | 위치 | 이슈 | 권장 조치 |
|------|------|------|----------|
| `quality/page.tsx` | 117-119 | AI 신뢰도 컬럼이 `ai_anomaly_score`를 사용. CLAUDE.md의 confidence_score 요구는 충족하나(품질 도메인은 C-5 결정으로 의도적 명명), 가열 AI(`confidence_score`)·출하(`ai_confidence`)와 필드명이 3종으로 분산됨 | 도메인별 명명 분산은 의도된 결정이므로 그대로 두되, 표시 라벨은 "AI 신뢰도"로 통일되어 있어 사용자 영향은 없음. 명명 통일은 별도 리팩터 과제로 트래킹 |
| `heating/page.tsx` | 102, 134 / `quality/page.tsx` 107, 124 | `Column<T>` 배열에서 `key: 'id'`가 2회 중복(ID 컬럼 + 액션/진행률 컬럼). Table이 인덱스 키를 쓰면 무해하나 key 충돌 가능성 | 액션/진행률 컬럼 key를 `'actions'`/`'progress'` 등 고유값으로 변경 권장 |
| `heating/page.tsx` | 22-30 | `progressPercent`가 총 사이클을 120분 하드코딩으로 가정. 레시피별 `heating_minutes + soaking_minutes`가 존재하는데 미사용 | 레시피 총 시간이 응답에 포함되면 그것을 분모로 사용하도록 개선(매직넘버 제거) |
| `heating/conditions/page.tsx` | 64-66, 190-212 | 검색 Input의 `onChange`가 `search` state를 갱신 → `fetchRecipes`가 재생성 → `useEffect([page, fetchRecipes])`가 매 키 입력마다 재실행. 실제 호출은 검색 버튼/Enter로 의도했으나 의존성 때문에 타이핑 중에도 fetch가 발생할 수 있음 | `useEffect` 의존성을 `[page]`로 줄이고 검색은 명시적 호출만 하도록 분리(또는 debounce) |
| `heating/conditions/page.tsx` | 72 | `isEdit = initial !== EMPTY_FORM` 참조 동등 비교. 편집 시에는 새 객체가 들어오므로 동작하지만, 다이얼로그 타이틀 판정을 객체 참조에 의존하는 것은 취약 | `editTarget` 존재 여부를 prop으로 전달해 판정하는 편이 견고 |
| `heating/analysis/page.tsx` | 260, 304 | `data as unknown as Record<string, unknown>[]` 이중 캐스팅으로 `SimpleBarChart`에 전달. `any`는 아니나 타입 안전성 우회 | `SimpleBarChart`를 제네릭(`<T extends Record<string, unknown>>`)으로 만들어 캐스팅 제거 권장 |

### Info (참고)

- TypeScript: 7개 파일 모두 `any` 미사용. 싱글 쿼트/세미콜론 없음 규칙 준수. ✅
- 에러 처리: 모든 fetch가 try/catch + AlertBanner graceful degradation. monitoring 페이지는 AbortController로 폴링 경합 제어 + AbortError 무시 처리 양호. ✅
- 빈 상태: 모든 Table에 `emptyText`, monitoring/analysis/ai-optimize는 전용 빈 상태 카드 제공. ✅
- °C 단위: monitoring(존별 온도), conditions(목표온도), ai-optimize(추천 프로파일·입력), analysis(온도편차 ±°C) 전부 °C 표기. ✅
- confidence_score: ai-optimize가 `Math.round(confidence_score*100)%` + `ConfidenceBadge`로 표시. quality는 `ai_anomaly_score`를 `AiConfidenceBar`로 표시. ✅
- 클라이언트 컴포넌트: 7개 모두 `'use client'`. 데이터 페치 페이지 특성상 불가피하나, 차트/드로어/폼다이얼로그를 같은 파일 내 하위 컴포넌트로 적절히 분리. ✅
- 라우트 정합성(이전 route-gap 이슈 재검증): heating-service의 monitoring/summary·furnaces·temperature-trend, analysis/* , :id/timeline·temperature-history, `/heating/optimize`, `/heating-recipes` CRUD가 모두 백엔드 라우트에 구현되어 있음을 확인. heating 측 frontend-ahead-of-backend 갭은 해소됨. ✅

## 개선 권장 사항

1. (완료) 품질 판정 PATCH 경로 정렬 — 판정 기능 복구.
2. Table 컬럼의 중복 `key: 'id'`를 고유 키로 변경(heating list, quality).
3. `heating/page.tsx` 진행률 계산의 120분 하드코딩 제거 — 레시피 총 시간 기반 산출.
4. `heating/conditions` 검색 useEffect 의존성 정리로 불필요한 재페치 제거.
5. `SimpleBarChart` 제네릭화로 이중 캐스팅 제거.
6. AI 신뢰도 필드명(confidence_score / ai_anomaly_score / ai_confidence) 분산은 의도된 결정이나 장기적으로 응답 어댑터 계층에서 단일 필드로 정규화 검토.

## 배포 판정

수정 후 Critical 0건. Warning만 잔존 — **배포 가능**(판정 기능 복구 확인 후).
