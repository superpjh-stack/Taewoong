'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Pagination } from './pagination'

interface PaginationNavProps {
  page: number
  totalPages: number
  className?: string
}

export function PaginationNav({ page, totalPages, className }: PaginationNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`${pathname}?${params.toString()}`)
  }

  return <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} className={className} />
}
