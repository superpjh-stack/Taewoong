/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@taewung/types'],
  output: 'standalone',

  // Phase 7 — REQ-04: 보안 응답 헤더
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control',  value: 'on' },
        ],
      },
    ]
  },
}

export default nextConfig
