'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import {
  listRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  type HeatingRecipe,
  type CreateRecipeData,
} from '@/lib/services/heating-service'

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'active', label: '활성' },
  { value: 'inactive', label: '비활성' },
]

const GRADE_OPTIONS = [
  { value: '', label: '전체 강종' },
  { value: 'SS400', label: 'SS400' },
  { value: 'STS304', label: 'STS304' },
  { value: 'SCM435', label: 'SCM435' },
  { value: 'S45C', label: 'S45C' },
]

const EMPTY_FORM: CreateRecipeData = {
  recipe_name: '',
  material_grade: '',
  zone_temps: { zone_1: 1180, zone_2: 1200, zone_3: 1210, zone_4: 1200 },
  heating_minutes: 90,
  soaking_minutes: 20,
  status: 'active',
  note: '',
}

function RecipeFormDialog({
  open,
  onClose,
  onSave,
  initial,
  loading,
  error,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: CreateRecipeData) => void
  initial: CreateRecipeData
  loading: boolean
  error: string | null
}) {
  const [form, setForm] = useState<CreateRecipeData>(initial)

  useEffect(() => {
    setForm(initial)
  }, [initial, open])

  const setZone = (key: string, val: string) => {
    setForm((f) => ({ ...f, zone_temps: { ...f.zone_temps, [key]: Number(val) } }))
  }

  const isEdit = initial !== EMPTY_FORM

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? '레시피 수정' : '레시피 등록'}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onSave(form)}
            loading={loading}
            disabled={!form.recipe_name || !form.material_grade}
          >
            저장
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <AlertBanner level="danger" message={error} />}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Input
              label="레시피명"
              value={form.recipe_name}
              onChange={(e) => setForm((f) => ({ ...f, recipe_name: e.target.value }))}
              placeholder="R-SS400-M"
            />
          </div>
          <div className="col-span-2">
            <Input
              label="강종"
              value={form.material_grade}
              onChange={(e) => setForm((f) => ({ ...f, material_grade: e.target.value }))}
              placeholder="SS400"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            존별 목표온도 (°C)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(form.zone_temps).map(([key, val]) => (
              <Input
                key={key}
                label={`${key.replace('zone_', '')}존`}
                type="number"
                value={String(val)}
                onChange={(e) => setZone(key, e.target.value)}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="가열 시간 (분)"
            type="number"
            value={String(form.heating_minutes)}
            onChange={(e) => setForm((f) => ({ ...f, heating_minutes: Number(e.target.value) }))}
          />
          <Input
            label="균열 시간 (분)"
            type="number"
            value={String(form.soaking_minutes)}
            onChange={(e) => setForm((f) => ({ ...f, soaking_minutes: Number(e.target.value) }))}
          />
        </div>

        <Select
          label="상태"
          options={[
            { value: 'active', label: '활성' },
            { value: 'inactive', label: '비활성' },
          ]}
          value={form.status}
          onChange={(v) => setForm((f) => ({ ...f, status: v as 'active' | 'inactive' }))}
        />

        <Input
          label="비고"
          value={form.note ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          placeholder="선택 입력"
        />
      </div>
    </Dialog>
  )
}

export default function HeatingConditionsPage() {
  const [recipes, setRecipes] = useState<HeatingRecipe[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HeatingRecipe | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<HeatingRecipe | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchRecipes = useCallback(async (p: number) => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await listRecipes({
        page: p,
        limit: 15,
        recipe_name: search || undefined,
        material_grade: gradeFilter || undefined,
        status: statusFilter || undefined,
      })
      setRecipes(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch {
      setFetchError('레시피 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [search, gradeFilter, statusFilter])

  useEffect(() => {
    fetchRecipes(page)
  }, [page, fetchRecipes])

  const handleSearch = () => {
    setPage(1)
    fetchRecipes(1)
  }

  const handleSave = async (data: CreateRecipeData) => {
    setSaving(true)
    setSaveError(null)
    try {
      if (editTarget) {
        await updateRecipe(editTarget.id, data)
      } else {
        await createRecipe(data)
      }
      setDialogOpen(false)
      setEditTarget(null)
      fetchRecipes(page)
    } catch {
      setSaveError('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteRecipe(deleteTarget.id)
      setDeleteTarget(null)
      fetchRecipes(page)
    } catch {
      // ignore — keep dialog open
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<HeatingRecipe>[] = [
    { key: 'recipe_name', header: '레시피명' },
    { key: 'material_grade', header: '강종' },
    {
      key: 'zone_temps',
      header: '목표 최고온도',
      render: (_, r) => {
        const max = Math.max(...Object.values(r.zone_temps))
        return `${max.toLocaleString()}°C`
      },
    },
    {
      key: 'heating_minutes',
      header: '가열시간',
      render: (v) => `${v}분`,
    },
    {
      key: 'status',
      header: '상태',
      render: (v) => (
        <Badge variant={v === 'active' ? 'success' : 'default'}>
          {v === 'active' ? '활성' : '비활성'}
        </Badge>
      ),
    },
    {
      key: 'id',
      header: '액션',
      align: 'right',
      render: (_, r) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditTarget(r)
              setSaveError(null)
              setDialogOpen(true)
            }}
          >
            수정
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteTarget(r)}
          >
            삭제
          </Button>
        </div>
      ),
    },
  ]

  const formInitial: CreateRecipeData = editTarget
    ? {
        recipe_name: editTarget.recipe_name,
        material_grade: editTarget.material_grade,
        zone_temps: editTarget.zone_temps,
        heating_minutes: editTarget.heating_minutes,
        soaking_minutes: editTarget.soaking_minutes,
        status: editTarget.status,
        note: editTarget.note ?? '',
      }
    : EMPTY_FORM

  return (
    <div>
      <PageHeader
        title="레시피/작업조건 관리"
        breadcrumbs={[{ label: '가열공정', href: '/heating' }, { label: '작업조건관리' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditTarget(null)
              setSaveError(null)
              setDialogOpen(true)
            }}
          >
            + 레시피 등록
          </Button>
        }
      />

      {fetchError && (
        <AlertBanner
          level="warn"
          message={fetchError}
          onDismiss={() => setFetchError(null)}
          className="mb-4"
        />
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <Input
          placeholder="레시피명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ width: '200px' }}
        />
        <Select
          options={GRADE_OPTIONS}
          value={gradeFilter}
          onChange={setGradeFilter}
          placeholder="전체 강종"
        />
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="전체 상태"
        />
        <Button variant="secondary" size="sm" onClick={handleSearch}>
          검색
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          data={recipes}
          loading={loading}
          rowKey={(r) => r.id}
          emptyText="레시피 데이터가 없습니다"
        />
        <div className="flex justify-center py-3">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </Card>

      <RecipeFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditTarget(null)
        }}
        onSave={handleSave}
        initial={formInitial}
        loading={saving}
        error={saveError}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="레시피 삭제"
        description={`'${deleteTarget?.recipe_name}' 레시피를 삭제하시겠습니까?`}
        confirmLabel="삭제"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
