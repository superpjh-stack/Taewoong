# [Design] 기준정보관리 (reference-info)

> **Summary**: 품질기준·작업표준·코드 등 MES 운영의 근간이 되는 기준 데이터를 등록·관리·조회하는 모듈의 UI 아키텍처 설계
>
> **Author**: Frontend Architect Agent
> **Created**: 2026-05-21
> **Based On**: [reference-info.plan.md](../../01-plan/features/reference-info.plan.md)
> **Status**: Draft

---

## 1. 개요

### 설계 목표

- 기존 `admin/page.tsx` 탭 패턴과 `admin-service.ts` 서비스 레이어 패턴을 일관되게 확장
- 세 개의 독립 페이지(`/reference-info/quality-specs`, `/work-standards`, `/code-masters`)를 단일 라우트 그룹으로 묶어 공통 레이아웃 공유
- 신규 컴포넌트 최소화 — 기존 `Card`, `Table`, `Badge`, `Button`, `Input`, `Pagination`, `Dialog`, `Select` 재사용
- 신규 필요 컴포넌트: `KeyValueEditor`(criteria JSON 편집), `VersionHistoryPanel`(버전 이력), `SortableTableRow`(drag-and-drop 정렬)
- 권한 기반 UI 렌더링: `ADMIN`, `QUALITY_MGR`, `PROCESS_ENG` 역할에 따라 등록·수정·비활성화 버튼 조건부 노출

### 전제 조건

- CSS 변수 토큰: `--bg-primary`, `--bg-secondary`, `--bg-card`, `--accent`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border`
- 페이지 라우팅: Next.js App Router `(protected)` 그룹 내 배치
- 서비스 레이어: `apps/web/lib/services/reference-service.ts` 신규 생성
- 타입 정의: `apps/web/lib/types/reference.ts` 신규 생성

---

## 2. 페이지 구조

### 2-1. 라우팅 맵

```
app/
└── (protected)/
    └── reference-info/
        ├── layout.tsx                  # 공통 레이아웃 (선택적)
        ├── page.tsx                    # 인덱스 — 3개 카드 그리드
        ├── quality-specs/
        │   └── page.tsx                # 품질기준 관리
        ├── work-standards/
        │   └── page.tsx                # 작업표준 관리
        └── code-masters/
            └── page.tsx                # 코드 관리
```

### 2-2. 각 페이지 컴포넌트 계층

#### 인덱스 페이지 (`/reference-info`)

```
ReferenceInfoIndexPage
├── PageHeader (title="기준정보관리")
└── div.grid (3열)
    ├── ReferenceNavCard (품질기준 관리)
    ├── ReferenceNavCard (작업표준 관리)
    └── ReferenceNavCard (코드 관리)
```

#### 품질기준 관리 (`/reference-info/quality-specs`)

```
QualitySpecsPage                        # 'use client'
├── PageHeader
│   ├── breadcrumbs: [기준정보관리, 품질기준 관리]
│   └── actions: <Button> 신규 등록 (권한 체크)
├── QualitySpecFilterBar               # 필터 영역
│   ├── Input (spec_code 검색)
│   ├── Select (inspection_type)
│   ├── Select (is_active: 전체/활성/비활성)
│   └── Button 검색
├── AlertBanner (에러 시)
├── Card
│   ├── Table<QualitySpec>
│   │   └── 열: 기준코드, 소재유형, 고객사, 검사유형, 버전, 활성여부, 등록일, 액션
│   └── Pagination
├── QualitySpecFormDialog              # 등록/수정 모달
│   ├── Dialog (size="lg")
│   └── QualitySpecForm
│       ├── Input (spec_code, material_type, customer_code, standard)
│       ├── Select (inspection_type)
│       ├── KeyValueEditor (criteria)  # 신규 컴포넌트
│       └── footer: [취소, 저장]
└── ConfirmDialog                      # 비활성화 확인
```

#### 작업표준 관리 (`/reference-info/work-standards`)

```
WorkStandardsPage                      # 'use client'
├── PageHeader
│   ├── breadcrumbs: [기준정보관리, 작업표준 관리]
│   └── actions: <Button> 신규 등록 (권한 체크)
├── WorkStandardFilterBar
│   ├── Input (standard_code / title 검색)
│   ├── Select (process_type)
│   └── Select (is_active)
├── AlertBanner (에러 시)
├── Card
│   ├── Table<WorkStandard>
│   │   └── 열: 표준코드, 공정유형, 제목, 버전, 활성여부, 첨부, 수정일, 액션
│   └── Pagination
├── WorkStandardFormDialog             # 등록/수정 모달
│   ├── Dialog (size="lg")
│   └── WorkStandardForm
│       ├── Input (standard_code, title)
│       ├── Select (process_type)
│       ├── Textarea (content)
│       ├── FileInput (attachment)     # 신규 — input[type=file] 래퍼
│       └── footer: [취소, 저장]
├── VersionHistoryPanel                # 신규 컴포넌트 — 버전 이력 사이드 패널
└── ConfirmDialog
```

#### 코드 관리 (`/reference-info/code-masters`)

```
CodeMastersPage                        # 'use client'
├── PageHeader
│   ├── breadcrumbs: [기준정보관리, 코드 관리]
│   └── actions: <Button> 신규 등록 (ADMIN 전용)
├── CategoryTabBar                     # 카테고리 탭 (admin/page.tsx 탭 패턴 재사용)
│   └── button × N (카테고리별)
├── CodeMasterFilterBar
│   ├── Input (code / name 검색)
│   └── Select (is_active)
├── AlertBanner (에러 시)
├── Card
│   ├── Table<CodeMaster>
│   │   ├── SortableTableRow          # 신규 — drag handle 포함 행
│   │   └── 열: 순서, 카테고리, 코드, 명칭(KO), 명칭(EN), 활성여부, 액션
│   └── Pagination
├── CodeMasterFormDialog               # 등록/수정 모달
│   ├── Dialog (size="md")
│   └── CodeMasterForm
│       ├── Select (category)
│       ├── Input (code — 등록 시만 활성)
│       ├── Input (name, name_en)
│       ├── Input type=number (sort_order)
│       └── footer: [취소, 저장]
└── ConfirmDialog
```

---

## 3. UI 레이아웃 (ASCII 모형)

### 3-1. 인덱스 페이지

```
┌──────────────────────────────────────────────────────────────────┐
│  기준정보관리                                                      │
│  MES 운영의 근간이 되는 기준 데이터를 중앙에서 관리합니다           │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │
│  │  품질기준 관리  │  │  작업표준 관리  │  │   코드 관리    │      │
│  │                │  │                │  │                │      │
│  │  [아이콘]      │  │  [아이콘]      │  │  [아이콘]      │      │
│  │  품질 검사 기준 │  │  공정별 SOP    │  │  시스템 전역   │      │
│  │  및 판정 기준  │  │  및 작업 절차  │  │  코드 체계 관리 │      │
│  │                │  │                │  │                │      │
│  │  [→ 이동]     │  │  [→ 이동]     │  │  [→ 이동]     │      │
│  └────────────────┘  └────────────────┘  └────────────────┘      │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### 3-2. 품질기준 관리

```
┌──────────────────────────────────────────────────────────────────┐
│  기준정보관리 > 품질기준 관리              [+ 신규 등록]           │
│  소재별 품질 판정 기준을 등록하고 관리합니다                        │
├──────────────────────────────────────────────────────────────────┤
│  [기준코드 검색______]  [검사유형 ▼]  [활성여부 ▼]  [검색]        │
├──────────────────────────────────────────────────────────────────┤
│  기준코드    소재유형    고객사    검사유형    버전    상태    액션   │
│ ─────────────────────────────────────────────────────────────── │
│  QS-001     STS304     A사       인장강도    v2.0  [활성]  [수정] │
│  QS-002     STS316     -         경도        v1.0  [활성]  [수정] │
│  QS-003     SCM440     B사       초음파      v1.2  [비활성][수정] │
│  ...                                                             │
├──────────────────────────────────────────────────────────────────┤
│                    ◀  1  2  3  ▶                                  │
└──────────────────────────────────────────────────────────────────┘

[등록/수정 모달 — size="lg"]
┌────────────────────────────────────────┐
│  품질기준 등록                      [X] │
│  ─────────────────────────────────────  │
│  기준코드 *  [____________]             │
│  소재유형 *  [____________]             │
│  고객사코드  [____________]             │
│  규격명칭 *  [____________]             │
│  검사유형 *  [인장강도       ▼]         │
│  판정기준 *  (Key / Value 다중입력)     │
│  ┌──────────────────────────────────┐   │
│  │ + 항목 추가                      │   │
│  │ [tensile_min] [450]  [×]        │   │
│  │ [tensile_max] [600]  [×]        │   │
│  └──────────────────────────────────┘   │
│  ─────────────────────────────────────  │
│                       [취소]  [저장]    │
└────────────────────────────────────────┘

[비활성화 확인 모달 — ConfirmDialog]
┌────────────────────────────────┐
│  품질기준 비활성화          [X] │
│  이 기준을 비활성화하시겠습니까? │
│  비활성화된 기준은 검사 화면     │
│  선택 목록에서 제외됩니다.       │
│  ─────────────────────────────  │
│                  [취소]  [확인] │
└────────────────────────────────┘
```

### 3-3. 작업표준 관리

```
┌──────────────────────────────────────────────────────────────────┐
│  기준정보관리 > 작업표준 관리              [+ 신규 등록]           │
│  공정별 SOP 및 작업 조건 기준을 관리합니다                          │
├──────────────────────────────────────────────────────────────────┤
│  [코드/제목 검색______]  [공정유형 ▼]  [활성여부 ▼]  [검색]       │
├──────────────────────────────────────────────────────────────────┤
│  표준코드    공정유형    제목             버전  첨부  상태    액션   │
│ ─────────────────────────────────────────────────────────────── │
│  WS-H-001   가열        가열로 온도 기준  v1.1  [PDF][활성]  [수정]│
│  WS-F-001   단조        해머 작업 절차    v2.0  -    [활성]  [수정]│
│  WS-T-001   열처리      열처리 사이클 기준 v1.0  [IMG][비활성][수정]│
│  ...                                                             │
├──────────────────────────────────────────────────────────────────┤
│                    ◀  1  2  3  ▶                                  │
└──────────────────────────────────────────────────────────────────┘

[등록/수정 모달 — size="lg"]
┌────────────────────────────────────────┐
│  작업표준 등록                      [X] │
│  ─────────────────────────────────────  │
│  표준코드 *    [____________]           │
│  공정유형 *    [가열           ▼]       │
│  제목     *    [____________]           │
│  작업 내용 *                           │
│  ┌──────────────────────────────────┐   │
│  │                                  │   │
│  │  (Textarea — 4행)               │   │
│  │                                  │   │
│  └──────────────────────────────────┘   │
│  첨부파일      [파일 선택] PDF·PNG·JPG  │
│                최대 10MB               │
│  ─────────────────────────────────────  │
│                       [취소]  [저장]    │
└────────────────────────────────────────┘

[버전 이력 사이드 패널 — VersionHistoryPanel]
       ┌──────────────────────────┐
       │  버전 이력 — WS-H-001    │
       │  ─────────────────────   │
       │  v1.1  2026-05-10  [현재]│
       │  v1.0  2026-04-01       │
       └──────────────────────────┘
```

### 3-4. 코드 관리

```
┌──────────────────────────────────────────────────────────────────┐
│  기준정보관리 > 코드 관리                  [+ 신규 등록]           │
│  시스템 전역 코드 체계를 카테고리별로 관리합니다                     │
├──────────────────────────────────────────────────────────────────┤
│  [MATERIAL_TYPE] [PROCESS_TYPE] [EQUIPMENT] [DEFECT_TYPE] ...    │
│  ─── 카테고리 탭 ──────────────────────────────────────────────── │
│  [코드/명칭 검색______]  [활성여부 ▼]  [검색]                     │
├──────────────────────────────────────────────────────────────────┤
│  순서  카테고리         코드     명칭(KO)    명칭(EN)  상태   액션  │
│ ─────────────────────────────────────────────────────────────── │
│  ⠿  1  MATERIAL_TYPE   STS304   스테인리스  Stainless [활성][수정]│
│  ⠿  2  MATERIAL_TYPE   SCM440   크롬몰리    Chrome-Mo [활성][수정]│
│  ⠿  3  MATERIAL_TYPE   STS316   스테인리스  Stainless [비활성][수정]│
│  ...                                                             │
├──────────────────────────────────────────────────────────────────┤
│                    ◀  1  2  3  ▶                                  │
└──────────────────────────────────────────────────────────────────┘
  ⠿ = 드래그 핸들 아이콘 (GripVertical)

[등록/수정 모달 — size="md"]
┌────────────────────────────┐
│  코드 등록              [X] │
│  ─────────────────────────  │
│  카테고리 *  [MATERIAL ▼]   │
│  코드     *  [________]     │
│            (등록 후 수정 불가)│
│  명칭(KO) *  [________]     │
│  명칭(EN)    [________]     │
│  정렬순서    [____]         │
│  ─────────────────────────  │
│              [취소]  [저장] │
└────────────────────────────┘
```

---

## 4. 컴포넌트 설계

### 4-1. 신규 컴포넌트

#### `KeyValueEditor`
- 경로: `apps/web/components/domain/KeyValueEditor.tsx`
- 용도: `quality_specs.criteria` — JSON 객체를 Key/Value 쌍으로 편집
- Props:
  ```typescript
  interface KeyValueEditorProps {
    value: Record<string, string>
    onChange: (value: Record<string, string>) => void
    keyPlaceholder?: string
    valuePlaceholder?: string
    disabled?: boolean
  }
  ```
- 내부 상태: `pairs: { key: string; value: string }[]` — 추가/삭제/변경 후 `onChange`로 Record 변환
- 렌더링: 행마다 `Input(key)` + `Input(value)` + 삭제 버튼(`X`), 하단 `[+ 항목 추가]` 버튼

#### `VersionHistoryPanel`
- 경로: `apps/web/components/domain/VersionHistoryPanel.tsx`
- 용도: 동일 `standard_code`의 버전 목록 표시 (작업표준 상세 내 슬라이드 패널)
- Props:
  ```typescript
  interface VersionHistoryPanelProps {
    open: boolean
    onClose: () => void
    standardCode: string
    currentId: number
    items: VersionHistoryItem[]    // { id, version, updated_at, is_active }
  }
  ```
- 렌더링: 오른쪽 슬라이드인 패널, `position: fixed; right: 0; top: 0; height: 100vh; width: 320px`

#### `SortableTableRow`
- 경로: `apps/web/components/domain/SortableTableRow.tsx`
- 용도: 코드 관리 테이블에서 drag-and-drop 행 정렬 지원
- 구현: HTML5 Drag API 사용 (`draggable`, `onDragStart`, `onDragOver`, `onDrop`)
- Props:
  ```typescript
  interface SortableTableRowProps {
    id: string
    index: number
    onReorder: (fromIndex: number, toIndex: number) => void
    children: React.ReactNode
  }
  ```

#### `ReferenceNavCard`
- 경로: `apps/web/components/domain/ReferenceNavCard.tsx`
- 용도: 인덱스 페이지 네비게이션 카드
- Props:
  ```typescript
  interface ReferenceNavCardProps {
    title: string
    description: string
    href: string
    icon: React.ReactNode
    count?: number    // 현재 활성 건수 (선택)
  }
  ```

#### `FileInput`
- 경로: `apps/web/components/ui/file-input.tsx`
- 용도: 작업표준 첨부파일 업로드 래퍼
- Props:
  ```typescript
  interface FileInputProps {
    accept?: string          // 기본: '.pdf,.png,.jpg,.jpeg'
    maxSizeMB?: number       // 기본: 10
    value?: File | null
    onChange?: (file: File | null) => void
    currentUrl?: string      // 기존 첨부파일 URL (수정 시)
    disabled?: boolean
  }
  ```

### 4-2. 기존 컴포넌트 재사용

| 컴포넌트 | 재사용 용도 |
|----------|------------|
| `PageHeader` | 모든 페이지 헤더 — `breadcrumbs`, `actions` props 활용 |
| `Card` | 테이블 컨테이너 래핑 |
| `Table<T>` | 모든 목록 테이블 — `Column<T>[]` 정의로 재사용 |
| `Badge` | 활성(`success`) / 비활성(`muted`) 상태 표시 |
| `Button` | 신규 등록, 검색, 저장, 취소, 비활성화 트리거 |
| `Input` | 검색 인풋, 폼 필드 |
| `Select` | 필터 드롭다운, 폼 셀렉트 |
| `Pagination` | 목록 페이지네이션 |
| `Dialog` | 등록/수정 폼 모달 (`size="lg"` 또는 `"md"`) |
| `ConfirmDialog` | 비활성화 확인 — `confirmVariant="danger"` |
| `AlertBanner` | API 에러 메시지 표시 |
| `Spinner` | 로딩 상태 오버레이 |

---

## 5. API 인터페이스

### 5-1. 타입 정의 (`apps/web/lib/types/reference.ts`)

```typescript
// ─── 공통 ───────────────────────────────────────────────────────
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ─── 품질기준 ────────────────────────────────────────────────────
export interface QualitySpec {
  id: number
  spec_code: string
  material_type: string
  customer_code: string | null
  standard: string
  inspection_type: string
  criteria: Record<string, string>
  version: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface QualitySpecListParams {
  material_type?: string
  customer_code?: string
  inspection_type?: string
  is_active?: boolean
  page?: number
  limit?: number
}

export interface CreateQualitySpecRequest {
  spec_code: string
  material_type: string
  customer_code?: string
  standard: string
  inspection_type: string
  criteria: Record<string, string>
}

export type UpdateQualitySpecRequest = Partial<CreateQualitySpecRequest>

// ─── 작업표준 ────────────────────────────────────────────────────
export interface WorkStandard {
  id: number
  standard_code: string
  process_type: string
  title: string
  content: string
  version: string
  attachment_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkStandardListParams {
  standard_code?: string
  process_type?: string
  is_active?: boolean
  page?: number
  limit?: number
}

export interface CreateWorkStandardRequest {
  standard_code: string
  process_type: string
  title: string
  content: string
  attachment?: File
}

export type UpdateWorkStandardRequest = Partial<Omit<CreateWorkStandardRequest, 'standard_code'>> & {
  attachment?: File
}

export interface VersionHistoryItem {
  id: number
  version: string
  is_active: boolean
  updated_at: string
}

// ─── 코드 마스터 ─────────────────────────────────────────────────
export interface CodeMaster {
  id: number
  category: string
  code: string
  name: string
  name_en: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CodeMasterListParams {
  category?: string
  code?: string
  name?: string
  is_active?: boolean
  page?: number
  limit?: number
}

export interface CreateCodeMasterRequest {
  category: string
  code: string
  name: string
  name_en?: string
  sort_order?: number
}

export type UpdateCodeMasterRequest = Omit<Partial<CreateCodeMasterRequest>, 'code'>

export interface ReorderCodeRequest {
  items: { category: string; code: string; sort_order: number }[]
}
```

### 5-2. 서비스 함수 시그니처 (`apps/web/lib/services/reference-service.ts`)

```typescript
import { apiClient } from '@/lib/api-client'
import {
  QualitySpec, QualitySpecListParams, CreateQualitySpecRequest, UpdateQualitySpecRequest,
  WorkStandard, WorkStandardListParams, CreateWorkStandardRequest, UpdateWorkStandardRequest,
  VersionHistoryItem,
  CodeMaster, CodeMasterListParams, CreateCodeMasterRequest, UpdateCodeMasterRequest, ReorderCodeRequest,
  PaginationMeta,
} from '@/lib/types/reference'

// ─── 공통 유틸 ───────────────────────────────────────────────────
function toQS(params: Record<string, unknown>): string { ... }

// ─── 품질기준 ────────────────────────────────────────────────────
export async function listQualitySpecs(params: QualitySpecListParams = {}):
  Promise<{ data: QualitySpec[]; pagination: PaginationMeta }>

export async function createQualitySpec(body: CreateQualitySpecRequest):
  Promise<QualitySpec>

export async function updateQualitySpec(id: number, body: UpdateQualitySpecRequest):
  Promise<QualitySpec>

export async function deactivateQualitySpec(id: number):
  Promise<void>

// ─── 작업표준 ────────────────────────────────────────────────────
export async function listWorkStandards(params: WorkStandardListParams = {}):
  Promise<{ data: WorkStandard[]; pagination: PaginationMeta }>

export async function createWorkStandard(body: CreateWorkStandardRequest):
  Promise<WorkStandard>
  // 첨부파일 있을 경우 FormData로 변환하여 multipart/form-data 전송

export async function updateWorkStandard(id: number, body: UpdateWorkStandardRequest):
  Promise<WorkStandard>

export async function deactivateWorkStandard(id: number):
  Promise<void>

export async function listWorkStandardVersions(standardCode: string):
  Promise<VersionHistoryItem[]>

// ─── 코드 마스터 ─────────────────────────────────────────────────
export async function listCodeMasters(params: CodeMasterListParams = {}):
  Promise<{ data: CodeMaster[]; pagination: PaginationMeta }>

export async function listCodeCategories():
  Promise<string[]>
  // GET /reference/codes/categories — 카테고리 탭 목록용

export async function createCodeMaster(body: CreateCodeMasterRequest):
  Promise<CodeMaster>

export async function updateCodeMaster(
  category: string,
  code: string,
  body: UpdateCodeMasterRequest,
): Promise<CodeMaster>

export async function deactivateCodeMaster(category: string, code: string):
  Promise<void>

export async function reorderCodeMasters(body: ReorderCodeRequest):
  Promise<void>
```

### 5-3. API 엔드포인트 매핑

| 서비스 함수 | Method | Path |
|------------|--------|------|
| `listQualitySpecs` | GET | `/reference/quality-specs` |
| `createQualitySpec` | POST | `/reference/quality-specs` |
| `updateQualitySpec` | PATCH | `/reference/quality-specs/:id` |
| `deactivateQualitySpec` | PATCH | `/reference/quality-specs/:id/deactivate` |
| `listWorkStandards` | GET | `/reference/work-standards` |
| `createWorkStandard` | POST | `/reference/work-standards` |
| `updateWorkStandard` | PATCH | `/reference/work-standards/:id` |
| `deactivateWorkStandard` | PATCH | `/reference/work-standards/:id/deactivate` |
| `listWorkStandardVersions` | GET | `/reference/work-standards?standard_code=:code&include_inactive=true` |
| `listCodeCategories` | GET | `/reference/codes/categories` |
| `listCodeMasters` | GET | `/reference/codes` |
| `createCodeMaster` | POST | `/reference/codes` |
| `updateCodeMaster` | PATCH | `/reference/codes/:category/:code` |
| `deactivateCodeMaster` | PATCH | `/reference/codes/:category/:code/deactivate` |
| `reorderCodeMasters` | PATCH | `/reference/codes/reorder` |

---

## 6. 상태 관리

### 6-1. 품질기준 관리 (`QualitySpecsPage`)

```typescript
// 목록 상태
const [items, setItems] = useState<QualitySpec[]>([])
const [total, setTotal] = useState(0)
const [page, setPage] = useState(1)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

// 필터 상태
const [filterInspectionType, setFilterInspectionType] = useState('')
const [filterIsActive, setFilterIsActive] = useState<'all' | 'true' | 'false'>('all')
const [searchCode, setSearchCode] = useState('')

// 모달 상태
const [dialogOpen, setDialogOpen] = useState(false)
const [editTarget, setEditTarget] = useState<QualitySpec | null>(null)  // null = 신규
const [confirmOpen, setConfirmOpen] = useState(false)
const [deactivateTarget, setDeactivateTarget] = useState<QualitySpec | null>(null)
const [saving, setSaving] = useState(false)
```

플로우:
1. `useEffect([page])` → `load()` 호출
2. 검색 버튼 or Enter → `setPage(1)` + `load(1, filters)`
3. `[수정]` 클릭 → `setEditTarget(item)` + `setDialogOpen(true)`
4. `[신규 등록]` 클릭 → `setEditTarget(null)` + `setDialogOpen(true)`
5. 폼 저장 → `createQualitySpec` 또는 `updateQualitySpec` → 성공 시 `load()` + `setDialogOpen(false)`
6. `[비활성화]` 클릭 → `setDeactivateTarget(item)` + `setConfirmOpen(true)`
7. ConfirmDialog 확인 → `deactivateQualitySpec` → 성공 시 `load()`

### 6-2. 작업표준 관리 (`WorkStandardsPage`)

품질기준 관리와 동일한 패턴에 추가:

```typescript
const [historyOpen, setHistoryOpen] = useState(false)
const [historyTarget, setHistoryTarget] = useState<WorkStandard | null>(null)
const [historyItems, setHistoryItems] = useState<VersionHistoryItem[]>([])
```

`[이력]` 버튼 클릭 → `listWorkStandardVersions(item.standard_code)` → `setHistoryItems` → `setHistoryOpen(true)`

### 6-3. 코드 관리 (`CodeMastersPage`)

```typescript
// 카테고리
const [categories, setCategories] = useState<string[]>([])
const [selectedCategory, setSelectedCategory] = useState<string>('')

// 목록 상태 (품질기준과 동일)
const [items, setItems] = useState<CodeMaster[]>([])
const [total, setTotal] = useState(0)
const [page, setPage] = useState(1)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

// 필터
const [filterIsActive, setFilterIsActive] = useState<'all' | 'true' | 'false'>('all')
const [searchText, setSearchText] = useState('')

// 모달 상태 (품질기준과 동일)
const [dialogOpen, setDialogOpen] = useState(false)
const [editTarget, setEditTarget] = useState<CodeMaster | null>(null)
const [confirmOpen, setConfirmOpen] = useState(false)
const [deactivateTarget, setDeactivateTarget] = useState<CodeMaster | null>(null)
const [saving, setSaving] = useState(false)

// 드래그 정렬 임시 상태
const [dragItems, setDragItems] = useState<CodeMaster[]>([])
// dragItems는 items와 동기화; drop 완료 시 reorderCodeMasters 호출
```

카테고리 탭 전환 플로우:
1. 마운트 → `listCodeCategories()` → `setCategories` + `setSelectedCategory(categories[0])`
2. 탭 클릭 → `setSelectedCategory(cat)` + `setPage(1)` → `load()`
3. drag-and-drop drop → `setDragItems(reordered)` + `reorderCodeMasters(payload)` 즉시 호출

---

## 7. 구현 체크리스트

### 파일 생성 목록

```
apps/web/
├── app/(protected)/reference-info/
│   ├── page.tsx                              # 인덱스 — 3개 카드 그리드
│   ├── quality-specs/
│   │   └── page.tsx                          # 품질기준 관리
│   ├── work-standards/
│   │   └── page.tsx                          # 작업표준 관리
│   └── code-masters/
│       └── page.tsx                          # 코드 관리
├── components/domain/
│   ├── KeyValueEditor.tsx                    # 신규
│   ├── VersionHistoryPanel.tsx               # 신규
│   ├── SortableTableRow.tsx                  # 신규
│   └── ReferenceNavCard.tsx                  # 신규
├── components/ui/
│   └── file-input.tsx                        # 신규
└── lib/
    ├── types/
    │   └── reference.ts                      # 신규 타입 정의
    └── services/
        └── reference-service.ts              # 신규 서비스 레이어
```

### 구현 순서 및 체크리스트

#### Phase A — 기반 작업
- [ ] `apps/web/lib/types/reference.ts` — 타입 정의 전체
- [ ] `apps/web/lib/services/reference-service.ts` — 서비스 함수 전체
- [ ] `apps/web/components/ui/file-input.tsx` — FileInput 컴포넌트
- [ ] `apps/web/components/domain/KeyValueEditor.tsx`
- [ ] `apps/web/components/domain/ReferenceNavCard.tsx`

#### Phase B — 페이지 구현
- [ ] `reference-info/page.tsx` — 인덱스 (ReferenceNavCard 3개)
- [ ] `reference-info/quality-specs/page.tsx`
  - [ ] 필터바 + 테이블 + 페이지네이션
  - [ ] QualitySpecFormDialog (KeyValueEditor 포함)
  - [ ] ConfirmDialog 비활성화
- [ ] `reference-info/work-standards/page.tsx`
  - [ ] 필터바 + 테이블 + 페이지네이션
  - [ ] WorkStandardFormDialog (FileInput 포함)
  - [ ] ConfirmDialog 비활성화
- [ ] `reference-info/code-masters/page.tsx`
  - [ ] CategoryTabBar
  - [ ] 필터바 + 테이블 + 페이지네이션
  - [ ] CodeMasterFormDialog
  - [ ] ConfirmDialog 비활성화

#### Phase C — 고급 기능
- [ ] `apps/web/components/domain/VersionHistoryPanel.tsx`
  - [ ] WorkStandardsPage에 이력 버튼 + 패널 연결
- [ ] `apps/web/components/domain/SortableTableRow.tsx`
  - [ ] CodeMastersPage에 drag-and-drop 정렬 연결
  - [ ] `reorderCodeMasters` API 호출 검증

#### Phase D — 마감
- [ ] 권한 체크 — `ADMIN`, `QUALITY_MGR`, `PROCESS_ENG` 역할별 버튼 노출 조건 확인
- [ ] `is_active` Badge — `success`(활성) / `muted`(비활성) 색상 확인
- [ ] 비활성화 ConfirmDialog `confirmVariant="danger"` 적용
- [ ] 첨부파일 크기 10MB 초과 시 클라이언트 사이드 에러 메시지 표시
- [ ] `code` 필드 — 수정 모달에서 `disabled` 처리
- [ ] `criteria` JSON — `KeyValueEditor` ↔ `Record<string, string>` 직렬화 검증
- [ ] 드래그 정렬 후 optimistic update — API 실패 시 이전 상태 복원
- [ ] 성공 토스트 (`toast`) — 등록/수정/비활성화 완료 후 표시
- [ ] `AlertBanner` — API 에러 시 상단 표시
- [ ] 페이지 진입 시 breadcrumbs 정확성 확인

---

## Related Documents

- Plan: [reference-info.plan.md](../../01-plan/features/reference-info.plan.md)
- Design System: [phase-5-design-system.design.md](phase-5-design-system.design.md)
- UI Integration: [phase-6-ui-integration.design.md](phase-6-ui-integration.design.md)
- 참조 구현 패턴: `apps/web/app/(protected)/admin/page.tsx`
- 서비스 레이어 패턴: `apps/web/lib/services/admin-service.ts`
