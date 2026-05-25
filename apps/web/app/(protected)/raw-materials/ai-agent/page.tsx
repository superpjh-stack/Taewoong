'use client'

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ConfidenceBadge } from '@/components/domain/ConfidenceBadge'
import { ApiError } from '@/lib/api-client'
import { queryAgent, type AiAgentResponse } from '@/lib/services/ai-service'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  confidence_score?: number
  timestamp: string
}

const QUICK_QUESTIONS = [
  '투입 가능 여부 확인',
  '불합격 원인 분석',
  '이번 달 합격률 통계',
  '공급사 품질 비교',
  '대기 중인 검사 목록',
  '최근 반려 원소재 조회',
]

const INITIAL_MESSAGE: ChatMessage = {
  id: 'init',
  role: 'assistant',
  content: '안녕하세요! 입고배합 관련 질문을 자유롭게 입력하세요.\n\nHeat No, LOT 번호, 공급사, 합격률 등 다양한 분석이 가능합니다.',
  timestamp: new Date().toISOString(),
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{
          background: isUser ? 'var(--accent)' : 'var(--bg-secondary)',
          color: isUser ? 'black' : 'var(--text-secondary)',
          border: '1px solid var(--border)',
        }}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className="rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap"
          style={{
            background: isUser ? 'var(--accent)' : 'var(--bg-secondary)',
            color: isUser ? 'black' : 'var(--text-primary)',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          }}
        >
          {msg.content}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.confidence_score !== undefined && (
            <ConfidenceBadge score={msg.confidence_score} />
          )}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
      >
        AI
      </div>
      <div
        className="rounded-2xl px-4 py-3"
        style={{ background: 'var(--bg-secondary)', borderRadius: '18px 18px 18px 4px' }}
      >
        <div className="flex gap-1 items-center h-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: 'var(--text-muted)',
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function RawMaterialsAiAgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId] = useState(() => crypto.randomUUID())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function sendMessage(question: string) {
    if (!question.trim() || isLoading) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const resp: AiAgentResponse = await queryAgent({
        question: question.trim(),
        agent_type: 'incoming',
        session_id: sessionId,
      })
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: resp.answer,
        confidence_score: resp.confidence_score,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'AI 응답을 받지 못했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void sendMessage(input)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  function handleNewSession() {
    setMessages([INITIAL_MESSAGE])
    setError(null)
    setInput('')
  }

  return (
    <div>
      <PageHeader title="AI Agent — 입고배합 분석" description="자연어로 입고 데이터를 조회하고 분석합니다" />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      {/* 애니메이션 스타일 */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>

      <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* 채팅 영역 */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* 메시지 목록 */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map((msg) => (
                <ChatBubble key={msg.id} msg={msg} />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            {/* 입력 영역 */}
            <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="질문을 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
                  rows={2}
                  disabled={isLoading}
                  className="flex-1 resize-none rounded-lg px-3 py-2 text-sm"
                  style={{
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
                <Button type="submit" loading={isLoading} disabled={!input.trim()}>
                  전송
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* 사이드 패널 */}
        <div className="w-52 flex flex-col gap-4">
          {/* 빠른 질문 */}
          <Card className="p-4">
            <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>빠른 질문</h3>
            <div className="flex flex-col gap-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => void sendMessage(q)}
                  disabled={isLoading}
                  className="text-left text-xs rounded-lg px-3 py-2 transition-colors"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.5 : 1,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </Card>

          {/* 세션 정보 */}
          <Card className="p-4">
            <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>세션 정보</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              {sessionId.slice(0, 16)}...
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              메시지: {messages.length - 1}개
            </p>
            <Button size="sm" variant="secondary" className="w-full" onClick={handleNewSession}>
              새 세션 시작
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
