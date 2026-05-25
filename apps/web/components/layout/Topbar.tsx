'use client'

import { Bell, User, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clearToken } from '@/lib/auth'
import { logout } from '@/lib/services/auth-service'

interface TopbarProps {
  alertCount?: number
  userName?: string
}

export function Topbar({ alertCount = 0, userName = '관리자' }: TopbarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    try { await logout() } catch (_) { /* ignore server error, proceed with local clear */ }
    clearToken()
    router.push('/login')
  }

  return (
    <header
      className="flex items-center flex-shrink-0 px-5 gap-4"
      style={{
        height: 'var(--header-h)',
        background: 'var(--bg-header)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 flex-shrink-0 pr-5"
        style={{
          width: 'var(--sidebar-w)',
          borderRight: '1px solid var(--border)',
          height: '100%',
        }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg font-bold text-xs"
          style={{
            background: 'linear-gradient(135deg, var(--accent), #0090b8)',
            color: '#000',
          }}
        >
          TW
        </div>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          AI-MES
        </span>
      </div>

      <div className="flex-1" />

      {/* Alert bell */}
      <button
        className="relative p-2 rounded-md transition-colors hover:bg-white/5"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="알림"
      >
        <Bell size={18} />
        {alertCount > 0 && (
          <span
            className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-black"
            style={{ background: 'var(--danger)' }}
          >
            {alertCount > 9 ? '9+' : alertCount}
          </span>
        )}
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-white/5"
          style={{ color: 'var(--text-secondary)' }}
          onClick={() => setUserMenuOpen((v) => !v)}
        >
          <div
            className="flex items-center justify-center w-7 h-7 rounded-full"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            <User size={14} />
          </div>
          <span style={{ color: 'var(--text-primary)' }}>{userName}</span>
          <ChevronDown size={13} />
        </button>

        {userMenuOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-40 rounded-md shadow-lg py-1 z-50"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <button
              className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-white/5"
              style={{ color: 'var(--danger)' }}
              onClick={handleLogout}
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
