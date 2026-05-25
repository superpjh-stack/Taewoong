// apps/web/app/robots.ts
// Phase 7 — REQ-07: SEO — 내부 MES 전체 크롤러 차단

import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
  return {
    rules: {
      userAgent: '*',
      disallow: '/',  // 내부 MES — 모든 크롤러 차단
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
