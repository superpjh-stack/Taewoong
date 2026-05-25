'use client'

import { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ConfidenceBadge } from './ConfidenceBadge'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  confidence_score?: number
  created_at?: string
}

interface AiChatInterfaceProps {
  agentType: string
  onSubmit: (question: string) => Promise<{ answer: string; confidence_score: number }>
  placeholder?: string
}

export function AiChatInterface({
  onSubmit,
  placeholder = '질문을 입력하세요...',
}: AiChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  async function handleSubmit() {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)
    try {
      const res = await onSubmit(question)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: res.answer, confidence_score: res.confidence_score },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex flex-col gap-3 min-h-64 max-h-96 overflow-y-auto p-3 rounded-lg"
        style={{ background: 'var(--bg-base)' }}
      >
        {messages.length === 0 && (
          <p
            className="text-sm text-center py-8"
            style={{ color: 'var(--text-muted)' }}
          >
            질문을 입력하면 AI가 답변합니다.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[80%] rounded-lg px-4 py-2 text-sm"
              style={{
                background: msg.role === 'user' ? 'var(--accent-dim)' : 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>
              {msg.confidence_score !== undefined && (
                <div className="mt-1.5 flex justify-end">
                  <ConfidenceBadge score={msg.confidence_score} />
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-lg px-4 py-2 text-xs flex items-center gap-2"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              AI 분석 중...
            </div>
          </div>
        )}
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          placeholder={placeholder}
          className="flex-1"
          disabled={loading}
        />
        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!input.trim()}
        >
          전송
        </Button>
      </div>
    </div>
  )
}
