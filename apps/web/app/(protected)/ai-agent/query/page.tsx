'use client'

import { useState, useRef, useEffect, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { AiConfidenceBar } from '@/components/domain/AiConfidenceBar'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import { queryAgent, deleteSession, type AgentType, type AiAgentResponse } from '@/lib/services/ai-service'
import { Send } from 'lucide-react'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  confidence_score?: number
  error?: boolean
}

const AGENT_OPTS = [
  { value: 'integrated', label: '통합 Agent' },
  { value: 'incoming', label: '입고배합 Agent' },
  { value: 'shipping', label: '출하 Agent' },
  { value: 'heating_opt', label: '가열 최적화 Agent' },
]

let msgId = 0

export default function AiAgentQueryPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [agentType, setAgentType] = useState<AgentType>('integrated')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    const question = input.trim()
    if (!question || loading) return

    const userMsg: Message = { id: ++msgId, role: 'user', content: question }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res: AiAgentResponse = await queryAgent({
        question,
        agent_type: agentType,
        session_id: sessionId,
      })
      if (res.session_id) setSessionId(res.session_id)
      setMessages((m) => [
        ...m,
        {
          id: ++msgId,
          role: 'assistant',
          content: res.answer,
          confidence_score: res.confidence_score,
        },
      ])
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'AI 서비스에 연결할 수 없습니다'
      setMessages((m) => [
        ...m,
        { id: ++msgId, role: 'assistant', content: msg, error: true },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    if (sessionId) {
      try { await deleteSession(sessionId) } catch { /* ignore */ }
    }
    setSessionId(undefined)
    setMessages([])
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="통합 AI 질의" description="제조 데이터 기반 자연어 AI 질의응답" />

      <div className="flex items-center gap-3 mb-4">
        <Select
          options={AGENT_OPTS}
          value={agentType}
          onChange={(v) => {
            setAgentType(v as AgentType)
            void handleReset()
          }}
          className="w-52"
        />
        {sessionId && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            세션: {sessionId.slice(0, 8)}…
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={handleReset}>
          대화 초기화
        </Button>
      </div>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardBody className="flex-1 overflow-y-auto flex flex-col gap-4 min-h-0 p-5">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                질문을 입력하면 AI가 공장 데이터를 분석하여 답변합니다.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[75%] rounded-lg px-4 py-3"
                style={
                  msg.role === 'user'
                    ? {
                        background: 'var(--accent-dim)',
                        borderColor: 'var(--accent)',
                        border: '1px solid',
                        color: 'var(--text-primary)',
                      }
                    : {
                        background: 'var(--bg-card-hover)',
                        border: '1px solid var(--border)',
                        color: msg.error ? 'var(--danger)' : 'var(--text-primary)',
                      }
                }
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.role === 'assistant' && msg.confidence_score != null && !msg.error && (
                  <AiConfidenceBar score={msg.confidence_score} className="mt-2" />
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div
                className="px-4 py-3 rounded-lg"
                style={{
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border)',
                }}
              >
                <Spinner size="sm" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </CardBody>

        {/* Input area */}
        <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          {messages.some((m) => m.error) && (
            <AlertBanner
              level="warn"
              message="AI 서비스가 응답하지 않습니다. 잠시 후 다시 시도하세요."
              className="mb-3"
            />
          )}
          <form onSubmit={handleSend} className="flex gap-3">
            <input
              className="flex-1 px-4 py-2 rounded-md text-sm outline-none"
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              placeholder="공장 현황, 품질 이상, 출하 일정 등을 질문하세요…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" disabled={!input.trim() || loading}>
              <Send size={15} />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
