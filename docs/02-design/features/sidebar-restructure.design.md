# [Design] 사이드바 재구조화 (sidebar-restructure)

> **요약**: Plan의 Gap 분석 결과를 반영한 NAV_GROUPS 데이터 구조 변경, Accordion 서브메뉴 동작 스펙, 시각 디자인 명세
>
> **작성자**: Frontend Architect
> **작성일**: 2026-05-21
> **상태**: Draft
> **연결 Plan**: `docs/01-plan/features/sidebar-restructure.plan.md`

---

## 1. 현재 vs 목표 NAV_GROUPS 데이터 구조 비교

### 현재 구조

```typescript
// 현재: NavItem은 children 없음, 단순 flat 목록
interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface NavGroup {
  items: NavItem[]
}

// 그룹이 7개로 분산 — 사업계획서 10대 메뉴 구조와 불일치
const NAV_GROUPS: NavGroup[] = [
  { items: [{ label: '대시보드',     href: '/dashboard',    icon: LayoutDashboard }] },
  { items: [{ label: '입고배합관리', href: '/raw-materials', icon: PackageSearch },
            { label: 'LOT 관리',     href: '/lots',          icon: Layers }] },        // ← 독립 항목(문제)
  { items: [{ label: '가열공정',     href: '/heating',       icon: Flame },
            { label: '단조/열처리',  href: '/processes',     icon: Hammer }] },
  { items: [{ label: '검사출하',     href: '/shipments',     icon: Ship },
            { label: '품질검사',     href: '/quality',       icon: ShieldCheck }] },   // ← 독립 항목(문제)
  { items: [{ label: 'AI Agent',     href: '/ai-agent',      icon: Bot }] },
  { items: [{ label: 'KPI 분석',     href: '/kpi',           icon: BarChart3 }] },
  { items: [{ label: '시스템 관리',  href: '/admin',         icon: Settings }] },
]
```

**문제점 정리**

| # | 문제 | 영향 |
|---|------|------|
| 1 | `LOT 관리`가 최상위 독립 항목 — 사업계획서에서는 입고배합관리 하위 프로세스 | 사용자 혼란, 계층 불명확 |
| 2 | `품질검사`가 최상위 독립 항목 — 사업계획서에서는 검사출하관리 하위 프로세스 | 동일 |
| 3 | `기준정보관리`, `데이터관리` 메뉴 누락 | 사업계획서 10대 메뉴 미달 |
| 4 | 6개 레이블이 사업계획서 표준 명칭과 불일치 | 이해관계자 커뮤니케이션 혼란 |
| 5 | `NavItem` 타입에 `children` 없어 서브메뉴 표현 불가 | 계층 구조 구현 불가 |

---

### 목표 구조

```typescript
// 변경: children 배열 추가로 서브메뉴 표현 가능
interface NavChild {
  label: string
  href: string
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  children?: NavChild[]   // 서브메뉴 (optional)
}

interface NavGroup {
  items: NavItem[]
}

// 단일 그룹 — 사업계획서 순서 그대로 10개 항목
const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'AI 대시보드',     href: '/dashboard',        icon: LayoutDashboard },
      {
        label: '입고배합관리',    href: '/raw-materials',    icon: PackageSearch,
        children: [
          { label: 'LOT 조회',    href: '/lots' },            // 기존 /lots 경로 유지
        ],
      },
      { label: '가열공정관리',    href: '/heating',           icon: Flame },
      {
        label: '검사출하관리',    href: '/shipments',         icon: Ship,
        children: [
          { label: '품질검사',    href: '/quality' },         // 기존 /quality 경로 유지
        ],
      },
      { label: '공정관리',        href: '/processes',         icon: Hammer },
      { label: '사용자/시스템관리', href: '/admin',           icon: Users },
      { label: '기준정보관리',    href: '/master-data',       icon: Database },    // 신규
      { label: '데이터관리',      href: '/data-management',  icon: BarChart2 },   // 신규
      { label: 'AI Agent 관리',   href: '/ai-agent',          icon: Bot },
      { label: 'KPI 관리',        href: '/kpi',               icon: BarChart3 },
    ],
  },
]
```

**변경 요약표**

| 변경 유형 | 항목 | 세부 내용 |
|-----------|------|----------|
| 레이블 변경 (7개) | 대시보드 → AI 대시보드 | href `/dashboard` 유지 |
| | 가열공정 → 가열공정관리 | href `/heating` 유지 |
| | 단조/열처리 → 공정관리 | href `/processes` 유지 |
| | 검사출하 → 검사출하관리 | href `/shipments` 유지 |
| | AI Agent → AI Agent 관리 | href `/ai-agent` 유지 |
| | KPI 분석 → KPI 관리 | href `/kpi` 유지 |
| | 시스템 관리 → 사용자/시스템관리 | href `/admin` 유지 |
| 신규 추가 (2개) | 기준정보관리 | href `/master-data`, icon `Database` |
| | 데이터관리 | href `/data-management`, icon `BarChart2` |
| 서브메뉴 이동 (2개) | LOT 관리 → 입고배합관리/LOT 조회 | href `/lots` 유지 |
| | 품질검사 → 검사출하관리/품질검사 | href `/quality` 유지 |
| 타입 변경 (1개) | NavItem에 `children?: NavChild[]` 추가 | Accordion 렌더링 분기 위해 필요 |

---

## 2. 서브메뉴 Accordion 동작 스펙

### 2-1. 열림/닫힘 상태 관리

```
상태 저장: useState<string[]>(openGroups)
  - openGroups: 현재 열려 있는 부모 메뉴의 href 배열
  - 초기값: usePathname()을 통해 현재 경로의 부모 메뉴를 자동 계산

자동 열림 조건:
  - 페이지 로드 시 현재 pathname이 children 중 하나의 href와 일치하면
    해당 부모 href를 openGroups에 포함

클릭 동작:
  - 부모 메뉴 클릭: 페이지 이동 없이 토글(openGroups에서 추가/제거)
  - 서브메뉴 클릭: 해당 href로 페이지 이동 (Link)
```

### 2-2. 자동 확장 로직

```typescript
// 현재 경로에서 어떤 부모 메뉴를 열어야 하는지 계산
function getInitialOpenGroups(pathname: string, items: NavItem[]): string[] {
  return items
    .filter(item =>
      item.children?.some(child => pathname === child.href || pathname.startsWith(child.href + '/'))
    )
    .map(item => item.href)
}

// useEffect 없이 useMemo로 계산 (SSR 안전)
const initialOpen = useMemo(() => getInitialOpenGroups(pathname, items), [pathname])
const [openGroups, setOpenGroups] = useState<string[]>(initialOpen)
```

### 2-3. 토글 동작

```typescript
function toggleGroup(href: string) {
  setOpenGroups(prev =>
    prev.includes(href)
      ? prev.filter(h => h !== href)
      : [...prev, href]
  )
}
```

### 2-4. 렌더링 분기 조건

| 조건 | 렌더 형태 | 클릭 동작 |
|------|-----------|----------|
| `item.children` 없음 | `<Link>` — 일반 메뉴 항목 | href로 페이지 이동 |
| `item.children` 있음 + 닫힘 | `<button>` + 화살표(▶) | openGroups 토글 |
| `item.children` 있음 + 열림 | `<button>` + 화살표(▼) + 서브메뉴 목록 | openGroups 토글 |

### 2-5. Active 상태 판정

```
부모 메뉴 active 조건:
  1. pathname === item.href (부모 경로 직접 접근)
  2. pathname.startsWith(item.href + '/') (부모 경로 하위)
  3. item.children?.some(c => pathname === c.href) (자식 경로 활성)

서브메뉴 active 조건:
  - pathname === child.href
  - pathname.startsWith(child.href + '/')
```

---

## 3. 서브메뉴 들여쓰기 시각 디자인

### 3-1. CSS 변수 활용

기존 `globals.css`(또는 `variables.css`)에 정의된 CSS 변수를 기반으로 서브메뉴 시각 계층을 표현한다. 신규 변수는 최소화하고 기존 토큰(`--accent`, `--accent-dim`, `--border`, `--text-secondary`)을 재사용한다.

```css
/* 추가 권장 CSS 변수 (globals.css에 추가) */
:root {
  --sidebar-submenu-indent: 2rem;      /* 서브메뉴 좌측 들여쓰기 (32px) */
  --sidebar-submenu-font-size: 0.8125rem; /* 서브메뉴 글자 크기 (13px, 부모보다 1px 작게) */
}
```

### 3-2. 부모 메뉴 (children 있음) 스타일

```
일반 상태:
  - 기존 nav item과 동일한 padding/height 유지
  - 우측에 ChevronRight(닫힘) / ChevronDown(열림) 아이콘 추가
  - color: var(--text-secondary)

Active(자식 경로 활성) 상태:
  - border-left: 2px solid var(--accent)
  - background: var(--accent-dim)
  - color: var(--accent)
  - 화살표 아이콘도 accent 색상 적용
```

### 3-3. 서브메뉴 항목 스타일

```
컨테이너:
  - overflow: hidden + CSS max-height transition으로 슬라이드 애니메이션
  - transition: max-height 200ms ease-out

각 서브메뉴 항목:
  - padding-left: var(--sidebar-submenu-indent)  ← 들여쓰기
  - font-size: var(--sidebar-submenu-font-size)
  - 좌측 구분선: border-left 1px solid var(--border), margin-left 1rem
  - Active: color var(--accent), 배경 없음 (미묘한 강조만)
  - Hover: text-[color:var(--text-primary)] + bg-white/5

레이아웃:
  ┌──────────────────────────────┐
  │ [아이콘] 입고배합관리  [▼]   │  ← 부모 버튼
  │  │ LOT 조회                  │  ← 서브메뉴 (indent + 좌측 선)
  └──────────────────────────────┘
```

### 3-4. 화살표 아이콘 회전 애니메이션

```
닫힘: ChevronRight — rotate(0deg)
열림: ChevronDown  — rotate(90deg) via CSS transform

transition: transform 200ms ease
```

실제 구현에서는 `ChevronRight` 아이콘에 조건부 `rotate-90` Tailwind 클래스를 적용하거나, `ChevronDown`을 열림 상태에 따라 교체하는 두 가지 방식 모두 가능. 본 프로젝트에서는 `ChevronDown`을 열림/닫힘 모두 사용하고 `rotate-180` 토글로 구현한다.

---

## 4. Sidebar.tsx 변경 체크리스트

### 타입 변경

- [ ] `NavChild` 인터페이스 추가 (`label`, `href`)
- [ ] `NavItem`에 `children?: NavChild[]` 필드 추가

### 임포트 변경

- [ ] `ChevronDown` lucide-react 추가
- [ ] `Hammer` 유지 (공정관리)
- [ ] `Layers` 제거 (LOT 관리 독립 항목 삭제)
- [ ] `ShieldCheck` 유지 (서브메뉴 아이콘은 부모가 보유)
- [ ] `Database` lucide-react 추가 (기준정보관리)
- [ ] `BarChart2` lucide-react 추가 (데이터관리)
- [ ] `Users` lucide-react 추가 (사용자/시스템관리)
- [ ] `Settings` 제거 (Users로 교체)

### NAV_GROUPS 데이터

- [ ] 그룹 분리 구조 → 단일 그룹(또는 구분선 없는 단순 구조)으로 통합
- [ ] 레이블 7개 수정 (위 변경 요약표 참조)
- [ ] 기준정보관리 항목 추가 (href: `/master-data`)
- [ ] 데이터관리 항목 추가 (href: `/data-management`)
- [ ] `입고배합관리`에 `children: [{ label: 'LOT 조회', href: '/lots' }]` 추가
- [ ] `검사출하관리`에 `children: [{ label: '품질검사', href: '/quality' }]` 추가
- [ ] `LOT 관리` 독립 항목 제거
- [ ] `품질검사` 독립 항목 제거
- [ ] 메뉴 순서를 사업계획서 p.40 순서(AI 대시보드 → ... → KPI 관리)로 정렬

### 상태 및 로직

- [ ] `useState<string[]>` 추가 (`openGroups`)
- [ ] `useMemo`로 초기 열림 그룹 계산 (pathname 기반)
- [ ] `toggleGroup(href)` 함수 구현

### 렌더링

- [ ] `item.children` 유무에 따른 분기 렌더링
  - children 없음: 기존 `<Link>` 렌더링 유지
  - children 있음: `<button>`(토글) + 조건부 서브메뉴 목록
- [ ] 서브메뉴 항목: `pl-[var(--sidebar-submenu-indent)]` 들여쓰기
- [ ] `ChevronDown` 아이콘 rotate 애니메이션 적용
- [ ] 부모 메뉴 active 판정 로직: 직접 경로 OR 자식 경로 포함
- [ ] 서브메뉴 active 판정 로직: 서브메뉴 href 일치

### 접근성

- [ ] `<button>` 요소에 `aria-expanded={isOpen}` 추가
- [ ] `<button>` 요소에 `aria-controls="submenu-{href}"` 추가
- [ ] 서브메뉴 컨테이너에 `id="submenu-{href}"` 추가

---

## 5. 컴포넌트 구조 다이어그램

```
Sidebar
├── <aside>
│   └── <nav>
│       └── NAV_GROUPS[0].items.map(item =>
│               if !item.children:
│                 <Link> (기존 스타일 유지)
│               else:
│                 <div>
│                   <button onClick=toggleGroup>
│                     <Icon />
│                     <span>label</span>
│                     <ChevronDown className={isOpen ? 'rotate-180' : ''} />
│                   </button>
│                   {isOpen && (
│                     <div id="submenu-{href}">
│                       item.children.map(child =>
│                         <Link pl-indent> child.label </Link>
│                       )
│                     </div>
│                   )}
│               )
```

---

## 6. 검증 시나리오

| 시나리오 | 기대 동작 |
|---------|----------|
| `/lots` 페이지 직접 접근 | 입고배합관리 자동 확장, LOT 조회 active 강조 |
| `/quality` 페이지 직접 접근 | 검사출하관리 자동 확장, 품질검사 active 강조 |
| `/raw-materials` 페이지 접근 | 입고배합관리 자체 active, 서브메뉴는 열리지 않아도 무방 |
| 입고배합관리 버튼 클릭 (이미 열림) | 서브메뉴 닫힘 (토글) |
| 입고배합관리 버튼 클릭 (닫힘 상태) | 서브메뉴 열림 |
| `/master-data` 접근 | 기준정보관리 active |
| `/data-management` 접근 | 데이터관리 active |

---

## 관련 문서

- Plan: `docs/01-plan/features/sidebar-restructure.plan.md`
- 구현 파일: `apps/web/components/layout/Sidebar.tsx`
- 플레이스홀더 페이지: `apps/web/app/master-data/page.tsx`, `apps/web/app/data-management/page.tsx`

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-05-21 | 초안 작성 — Plan 기반 데이터 구조·Accordion 스펙·체크리스트 정의 | Frontend Architect |
