'use client'

import { useState, useCallback } from 'react'
import type { ToastItem, ToastLevel } from '@/components/ui/toast'

let counter = 0

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, level: ToastLevel = 'info') => {
    const id = `toast-${++counter}`
    setToasts((prev) => [...prev, { id, message, level }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return {
    toasts,
    dismiss,
    toast,
    success: useCallback((msg: string) => toast(msg, 'success'), [toast]),
    error:   useCallback((msg: string) => toast(msg, 'error'),   [toast]),
    warn:    useCallback((msg: string) => toast(msg, 'warn'),    [toast]),
    info:    useCallback((msg: string) => toast(msg, 'info'),    [toast]),
  }
}
