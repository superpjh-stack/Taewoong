import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-base':        'var(--bg-base)',
        'bg-card':        'var(--bg-card)',
        'bg-card-hover':  'var(--bg-card-hover)',
        'bg-sidebar':     'var(--bg-sidebar)',
        'bg-header':      'var(--bg-header)',
        'border-mes':     'var(--border)',
        'accent':         'var(--accent)',
        'accent-dim':     'var(--accent-dim)',
        'warn':           'var(--warn)',
        'danger':         'var(--danger)',
        'success':        'var(--success)',
        'text-primary':   'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted':     'var(--text-muted)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      fontFamily: {
        sans: ['Noto Sans KR', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}

export default config
