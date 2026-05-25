'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import {
  listCodeMasters,
  createCodeMaster,
  type CodeMaster,
  type CreateCodeMasterData,
} from '@/lib/services/reference-info-service'

export default function CodeMastersPage() {
  const [items, setItems] = useState<CodeMaster[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateCodeMasterData>({
    category: '',
    code: '',
    name: '',
    name_en: '',
    sort_order: 0,
    is_active: true,
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function load(cat = activeCategory) {
    setLoading(true)
    setError(null)
    try {
      const result = await listCodeMasters({ category: cat || undefined })
      setItems(result.data)
      if (result.categories.length > 0 && categories.length === 0) {
        setCategories(result.categories)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(activeCategory)
  }, [activeCategory]) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setForm({ category: activeCategory, code: '', name: '', name_en: '', sort_order: 0, is_active: true })
    setFormError(null)
    setShowCreate(true)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)
    try {
      await createCodeMaster({
        ...form,
        name_en: form.name_en || undefined,
      })
      setShowCreate(false)
      void load(activeCategory)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : '등록에 실패했습니다')
    } finally {
      setFormLoading(false)
    }
  }

  const filteredItems = activeCategory
    ? items.filter((item) => item.category === activeCategory)
    : items

  const columns: Column<CodeMaster>[] = [
    { key: 'sort_order', header: '순서' },
    { key: 'category', header: '카테고리' },
    { key: 'code', header: '코드' },
    { key: 'name', header: '코드명' },
    { key: 'name_en', header: '영문명', render: (v) => v ? String(v) : <span style={{ color: 'var(--text-muted)' }}>-</span> },
    {
      key: 'is_active',
      header: '상태',
      render: (v) => <Badge variant={v ? 'success' : 'muted'}>{v ? '활성' : '비활성'}</Badge>,
    },
  ]

  const ALL_LABEL = '전체'

  return (
    <div>
      <PageHeader
        title="코드 관리"
        description={`${filteredItems.length}건`}
        actions={<Button size="sm" onClick={openCreate}>+ 코드 등록</Button>}
      />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      {/* 카테고리 탭 */}
      <div className="flex gap-1 mb-4 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        {[ALL_LABEL, ...categories].map((cat) => {
          const isAll = cat === ALL_LABEL
          const active = isAll ? activeCategory === '' : activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(isAll ? '' : cat)}
              className="px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0"
              style={{
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              {cat}
              {!isAll && (
                <span
                  className="ml-1 text-xs px-1 rounded"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                >
                  {items.filter((i) => i.category === cat).length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 카테고리별 그룹 뷰 (전체 탭일 때) */}
      {activeCategory === '' && categories.length > 0 ? (
        <div className="flex flex-col gap-4">
          {categories.map((cat) => {
            const catItems = items.filter((i) => i.category === cat)
            if (catItems.length === 0) return null
            return (
              <Card key={cat}>
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {cat}
                    <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{catItems.length}건</span>
                  </h3>
                </div>
                <Table
                  columns={columns.filter((c) => c.key !== 'category')}
                  data={catItems}
                  loading={false}
                  rowKey={(r) => r.id}
                  emptyText="코드가 없습니다"
                />
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <Table
            columns={columns}
            data={filteredItems}
            loading={loading}
            rowKey={(r) => r.id}
            emptyText="코드가 없습니다"
          />
        </Card>
      )}

      {/* 코드 등록 모달 */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="코드 등록"
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)} disabled={formLoading}>취소</Button>
            <Button size="sm" form="code-form" type="submit" loading={formLoading}>등록</Button>
          </>
        }
      >
        {formError && <AlertBanner level="danger" message={formError} className="mb-4" />}
        <form id="code-form" onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="카테고리"
            required
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="MATERIAL_TYPE, PROCESS_STAGE..."
          />
          <Input
            label="코드"
            required
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="SS400"
          />
          <Input
            label="코드명"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="일반구조용 압연강재"
          />
          <Input
            label="영문명"
            value={form.name_en ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
            placeholder="Rolled Steel for General Structure"
          />
          <Input
            label="정렬 순서"
            type="number"
            min="0"
            value={String(form.sort_order ?? 0)}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="code-is-active"
              checked={form.is_active ?? true}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            <label htmlFor="code-is-active" className="text-sm" style={{ color: 'var(--text-primary)' }}>활성화</label>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
