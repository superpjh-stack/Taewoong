# Plan — phase-5-design-system

> Pipeline Phase 5 | 공유 UI 컴포넌트 라이브러리 (Design System)

## 목표

Phase 3 HTML 목업에서 확립된 다크 네이비 MES 테마를 Next.js 14 App Router 위에 재현한다.
shadcn/ui + Tailwind CSS 기반으로 모든 페이지가 공유하는 레이아웃 셸, 베이스 컴포넌트, 도메인 컴포넌트를 구현하여 Phase 6 UI 통합의 기반을 마련한다.

## 구현 범위

### 1. 앱 스캐폴드 (`apps/web`)
- Next.js 14 App Router + TypeScript 설정
- Tailwind CSS 커스텀 테마 (MES 다크 팔레트)
- shadcn/ui 초기화 (`components.json`)
- 글로벌 CSS (`globals.css`) — CSS 변수 정의
- `pnpm-workspace.yaml`에 `@taewung/web` 등록

### 2. 레이아웃 셸
- `AppLayout` — Sidebar + Topbar + 콘텐츠 영역
- `Sidebar` — 네비게이션 메뉴 (7개 섹션), 아코디언 확장
- `Topbar` — 로고, 알림 벨, 사용자 메뉴
- `PageHeader` — 페이지 제목 + 브레드크럼

### 3. 베이스 컴포넌트 (shadcn/ui 래퍼 + MES 스타일)
| 컴포넌트 | 설명 |
|---------|------|
| Button | variant: primary/secondary/danger/ghost |
| Badge | LOT 상태, 검사 판정, 출하 상태 색상 |
| Card | 카드 컨테이너 (header/body/footer slot) |
| Table | 정렬·페이지네이션 지원 데이터 테이블 |
| Input | 텍스트 입력, 검색 입력 |
| Select | 드롭다운 선택 |
| Modal | 다이얼로그 (확인/취소) |
| Pagination | 페이지 이동 컨트롤 |
| Spinner | 로딩 인디케이터 |
| EmptyState | 데이터 없음 상태 |

### 4. 도메인 컴포넌트
| 컴포넌트 | 설명 |
|---------|------|
| KpiTile | 지표 값 + 추세 화살표 + 단위 |
| AlertBanner | 경고/위험/정보 알림 배너 |
| LotStatusBadge | LOT 단계별 색상 뱃지 |
| AiConfidenceBar | AI 신뢰도 프로그레스 바 (고/중/저) |
| EquipmentStatusDot | 장비 가동 상태 점 (운전/대기/점검/정지) |
| ProcessTimeline | LOT 공정 진행 타임라인 스텝 |

### 5. 유틸리티
- `lib/cn.ts` — `clsx` + `tailwind-merge` 헬퍼
- `lib/format.ts` — 날짜/숫자/단위 포맷터 (Intl API)
- `lib/api-client.ts` — fetch 래퍼 (base URL, JWT 헤더 주입, 에러 처리)

## 수용 기준 (AC)

| # | 기준 |
|---|------|
| AC1 | `apps/web`이 `pnpm dev`로 기동되고 `/` 경로에서 레이아웃 셸이 렌더링된다 |
| AC2 | CSS 변수 7종(`--bg-base`, `--bg-card`, `--accent`, `--warn`, `--danger`, `--success`, `--text-primary`)이 `globals.css`에 정의된다 |
| AC3 | Sidebar는 7개 메뉴 그룹을 렌더링하고 현재 경로에 활성 상태를 표시한다 |
| AC4 | Button 4가지 variant가 존재하고 `disabled` 상태를 지원한다 |
| AC5 | Badge는 LOT status(`active/hold/scrapped/shipped`)에 따라 다른 색상을 반환한다 |
| AC6 | Table은 `columns` + `data` prop으로 렌더링되고 빈 상태 시 EmptyState를 표시한다 |
| AC7 | KpiTile은 `value`, `unit`, `trend`(up/down/flat) prop을 받아 렌더링된다 |
| AC8 | AiConfidenceBar는 0–1 값을 받아 ≥0.7 green, 0.4–0.7 yellow, <0.4 red로 렌더링된다 |
| AC9 | `api-client.ts`는 `Authorization: Bearer <token>` 헤더를 자동 주입한다 |
| AC10 | TypeScript `strict: true` 하에 타입 오류가 없다 |

## 우선순위

- P0: 스캐폴드 + 레이아웃 셸 + CSS 변수
- P1: Button, Badge, Card, Table, KpiTile, AlertBanner
- P2: Input, Select, Modal, Pagination, AiConfidenceBar, ProcessTimeline
- P3: Spinner, EmptyState, EquipmentStatusDot, api-client
