// apps/web/app/layout.tsx
// Phase 7 — REQ-04: nonce 전달, REQ-07: OG 메타 태그

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'

// Phase 7: OG 메타 태그 + robots 차단
export const metadata: Metadata = {
  title: {
    default: '태웅 AI-MES',
    template: '%s | 태웅 AI-MES',
  },
  description: '㈜태웅 제조AI 특화 스마트공장 시스템',
  openGraph: {
    title: '태웅 AI-MES',
    description: '㈜태웅 제조AI 특화 스마트공장 MES',
    type: 'website',
    locale: 'ko_KR',
  },
  // 내부 MES — 크롤러 전체 차단
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Phase 7: middleware에서 주입한 nonce 읽기 (CSP nonce 전달용)
  const headersList = headers()
  const nonce = headersList.get('x-nonce') ?? ''

  return (
    <html lang="ko">
      {nonce && (
        <head>
          {/* nonce는 CSP script-src에 사용 — 인라인 스크립트가 필요한 경우 nonce={nonce} 전달 */}
          <meta name="csp-nonce" content={nonce} />
        </head>
      )}
      <body>{children}</body>
    </html>
  )
}
