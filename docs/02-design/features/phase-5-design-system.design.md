# Design — phase-5-design-system

> Pipeline Phase 5 | shadcn/ui 기반 MES 디자인 시스템

## 1. 파일 구조

```
apps/web/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json              # shadcn/ui config
├── app/
│   ├── globals.css              # CSS 변수 + Tailwind base
│   ├── layout.tsx               # Root layout (AppLayout 포함)
│   └── page.tsx                 # 루트 리디렉트 → /dashboard
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── PageHeader.tsx
│   ├── ui/                      # shadcn/ui 베이스
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── pagination.tsx
│   │   ├── spinner.tsx
│   │   └── empty-state.tsx
│   └── domain/                  # MES 도메인 컴포넌트
│       ├── KpiTile.tsx
│       ├── AlertBanner.tsx
│       ├── LotStatusBadge.tsx
│       ├── AiConfidenceBar.tsx
│       ├── EquipmentStatusDot.tsx
│       └── ProcessTimeline.tsx
└── lib/
    ├── cn.ts
    ├── format.ts
    └── api-client.ts
```

## 2. 디자인 토큰 (CSS 변수)

`globals.css` 에 정의. Tailwind `theme.extend.colors`에도 동일 변수로 매핑.

```css
:root {
  --bg-base:        #0f1729;
  --bg-card:        #1a2744;
  --bg-card-hover:  #1f2f52;
  --bg-sidebar:     #111e38;
  --bg-header:      #13203d;
  --border:         #243459;
  --accent:         #00d4ff;
  --accent-dim:     rgba(0,212,255,0.12);
  --accent-glow:    rgba(0,212,255,0.35);
  --warn:           #ff6b35;
  --warn-dim:       rgba(255,107,53,0.15);
  --danger:         #ff3b3b;
  --danger-dim:     rgba(255,59,59,0.15);
  --success:        #00d68f;
  --success-dim:    rgba(0,214,143,0.15);
  --text-primary:   #e8edf8;
  --text-secondary: #8fa3c7;
  --text-muted:     #4d6080;
  --sidebar-w:      240px;
  --header-h:       60px;
  --radius-sm:      6px;
  --radius-md:      10px;
  --radius-lg:      14px;
}
```

## 3. 레이아웃 셸

### AppLayout
```tsx
// Root layout wrapper
export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[--bg-base]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
```

### Sidebar 메뉴 구조
```
대시보드           /dashboard
─────────
입고배합관리       /raw-materials
LOT 관리           /lots
─────────
가열공정           /heating
단조/열처리        /processes
─────────
검사출하           /shipments
품질검사           /quality
─────────
AI Agent           /ai-agent
─────────
KPI 분석           /kpi
─────────
시스템 관리        /admin
```

Active 스타일: `bg-[--accent-dim] text-[--accent] border-l-2 border-[--accent]`

### Topbar
- 좌: 로고 `TW AI-MES`
- 우: 알림 벨 (badge 카운트), 사용자 아바타 드롭다운

## 4. 베이스 컴포넌트 스펙

### Button
```tsx
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

// primary: bg-[--accent] text-black
// secondary: bg-[--bg-card] border border-[--border] text-[--text-primary]
// danger: bg-[--danger] text-white
// ghost: transparent hover:bg-[--accent-dim] text-[--text-secondary]
```

### Badge
```tsx
type BadgeVariant = 'default' | 'success' | 'warn' | 'danger' | 'info' | 'muted'

// LOT status 매핑
const LOT_STATUS_VARIANT = {
  active:   'success',
  hold:     'warn',
  scrapped: 'danger',
  shipped:  'info',
} as const
```

### Table
```tsx
interface Column<T> {
  key: keyof T | string
  header: string
  width?: string
  render?: (value: unknown, row: T) => React.ReactNode
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyText?: string
}
```

### KpiTile
```tsx
interface KpiTileProps {
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'flat'
  trendValue?: string
  accentColor?: string  // defaults to --accent
}
```

### AiConfidenceBar
```tsx
interface AiConfidenceBarProps {
  score: number      // 0.0 – 1.0
  showLabel?: boolean
}
// ≥0.7: --success (초록)
// 0.4–0.7: --warn (주황)
// <0.4: --danger (빨강)
```

### ProcessTimeline
```tsx
type ProcessStage = 'incoming' | 'heating' | 'forging' | 'heat_treatment' | 'inspection' | 'shipped'

interface ProcessTimelineProps {
  currentStage: ProcessStage
  stages?: ProcessStage[]
}
// 완료: filled accent dot + solid line
// 현재: pulsing accent dot
// 대기: muted dot
```

## 5. 유틸리티 설계

### `lib/cn.ts`
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### `lib/format.ts`
```ts
// formatDate(iso: string): '2026-05-20 14:30'
// formatNumber(n: number, decimals?: number): '1,234.5'
// formatWeight(kg: number): '1,234 kg'
// formatDuration(hours: number): '2h 30m'
// formatPercent(ratio: number): '85.3%'
```

### `lib/api-client.ts`
```ts
// 환경변수: NEXT_PUBLIC_API_URL
// localStorage 'token' → Authorization: Bearer
// response: { success, data, error? }
// 에러 시 ApiError throw
```

## 6. package.json (apps/web)

```json
{
  "name": "@taewung/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slot": "^1.0.2",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.378.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0"
  }
}
```

## 7. shadcn/ui 설정 (`components.json`)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/cn"
  }
}
```

## 8. 구현 순서

1. `apps/web` 디렉터리 + 설정 파일들 (package.json, tsconfig, tailwind, next.config, postcss, components.json)
2. `globals.css` — CSS 변수 + Tailwind directives
3. `lib/cn.ts`, `lib/format.ts`, `lib/api-client.ts`
4. Layout: `AppLayout`, `Sidebar`, `Topbar`, `PageHeader`
5. UI: button, badge, card, table, input, select, dialog, pagination, spinner, empty-state
6. Domain: KpiTile, AlertBanner, LotStatusBadge, AiConfidenceBar, EquipmentStatusDot, ProcessTimeline
7. Root `app/layout.tsx` + `app/page.tsx`
