'use client'

import { useEffect, useRef } from 'react'
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ToastLevel = 'success' | 'error' | 'warn' | 'info'

export interface ToastItem {
  id: string
  message: string
  level: ToastLevel
}

const levelConfig: Record<ToastLevel, { icon: React.ReactNode; color: string; bg: string }> = {
  success: {
    icon: <CheckCircle2 size={15} />,
    color: 'var(--success)',
    bg: 'var(--success-dim)',
  },
  error: {
    icon: <XCircle size={15} />,
    color: 'var(--danger)',
    bg: 'var(--danger-dim)',
  },
  warn: {
    icon: <AlertTriangle size={15} />,
    color: 'var(--warn)',
    bg: 'var(--warn-dim)',
  },
  info: {
    icon: <Info size={15} />,
    color: 'var(--accent)',
    bg: 'var(--accent-dim)',
  },
}

interface ToastProps {
  toast: ToastItem
  onDismiss: (id: string) => void
}

function Toast({ toast, onDismiss }: ToastProps) {
  const config = levelConfig[toast.level]
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), 4000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [toast.id, onDismiss])

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg',
        'animate-in slide-in-from-right-4 fade-in duration-200',
        'w-72 max-w-xs',
      )}
      style={{ background: 'var(--bg-card)', border: `1px solid ${config.color}33` }}
    >
      <span style={{ color: config.color, flexShrink: 0, marginTop: 1 }}>
        {config.icon}
      </span>
      <p className="text-xs flex-1 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        <X size={13} />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
