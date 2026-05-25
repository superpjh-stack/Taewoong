'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const STATUS_OPTS = [
  { value: '', label: '전체 상태' },
  { value: 'active', label: '진행 중' },
  { value: 'hold', label: '보류' },
  { value: 'scrapped', label: '폐기' },
  { value: 'shipped', label: '출하 완료' },
]

const STAGE_OPTS = [
  { value: '', label: '전체 공정' },
  { value: 'incoming', label: '입고' },
  { value: 'heating', label: '가열' },
  { value: 'forging', label: '단조' },
  { value: 'heat_treatment', label: '열처리' },
  { value: 'inspection', label: '검사' },
  { value: 'shipped', label: '출하' },
]

export function LotFilterForm() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lotNoRef = useRef<HTMLInputElement>(null)

  const currentLotNo = searchParams.get('lot_no') ?? ''
  const currentStatus = searchParams.get('status') ?? ''
  const currentStage = searchParams.get('current_stage') ?? ''

  function apply(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    apply({ lot_no: lotNoRef.current?.value ?? '' })
  }

  function handleReset() {
    if (lotNoRef.current) lotNoRef.current.value = ''
    router.push(pathname)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 mb-4">
      <Input
        ref={lotNoRef}
        placeholder="LOT 번호 검색"
        defaultValue={currentLotNo}
        className="w-52"
        aria-label="LOT 번호"
      />
      <Select
        options={STATUS_OPTS}
        value={currentStatus}
        onChange={(v) => apply({ lot_no: lotNoRef.current?.value ?? currentLotNo, status: v })}
        className="w-36"
      />
      <Select
        options={STAGE_OPTS}
        value={currentStage}
        onChange={(v) =>
          apply({ lot_no: lotNoRef.current?.value ?? currentLotNo, current_stage: v })
        }
        className="w-36"
      />
      <Button size="sm" type="submit">검색</Button>
      {(currentLotNo || currentStatus || currentStage) && (
        <Button size="sm" variant="secondary" type="button" onClick={handleReset}>
          초기화
        </Button>
      )}
    </form>
  )
}
