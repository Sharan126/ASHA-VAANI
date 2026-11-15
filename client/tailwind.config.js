export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: { DEFAULT: '#F8FAFC', warm: '#FBF9F5' },
        ink: { DEFAULT: '#1E293B', muted: '#64748B', faint: '#CBD5E1', ghost: '#F1F5F9' },
        // Clinical teal (primary brand)
        teal: {
          50: '#F0FDFA', 100: '#CCFBF1', 200: '#99F6E4',
          300: '#5EEAD4', 400: '#2DD4BF', 500: '#14B8A6',
          600: '#0D9488', 700: '#0F766E', 800: '#115E59', 900: '#134E4A',
        },
        // Crimson — danger ONLY
        crimson: {
          50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA',
          400: '#F87171', 500: '#EF4444', 600: '#DC2626',
          700: '#B91C1C', 800: '#991B1B', 900: '#7F1D1D',
        },
      },
      boxShadow: {
        'orb-idle':      '0 0 0 0 rgba(15,118,110,0), 0 8px 32px rgba(15,118,110,0.18)',
        'orb-listen':    '0 0 0 12px rgba(16,185,129,0.12), 0 8px 40px rgba(16,185,129,0.28)',
        'orb-extract':   '0 0 0 8px rgba(15,118,110,0.10), 0 8px 32px rgba(15,118,110,0.20)',
        'orb-speak':     '0 0 0 12px rgba(79,70,229,0.12), 0 8px 40px rgba(79,70,229,0.24)',
        'orb-barge':     '0 0 0 12px rgba(217,119,6,0.14), 0 8px 40px rgba(217,119,6,0.22)',
        'card':          '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)',
        'card-elevated': '0 4px 24px rgba(0,0,0,0.08)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      animation: {
        'orb-idle':       'orbIdle 3.5s ease-in-out infinite',
        'orb-listen':     'orbListen 1.3s ease-in-out infinite',
        'orb-speak':      'orbSpeak 1.6s ease-in-out infinite',
        'ripple-1':       'ripple 1.8s cubic-bezier(0.22,1,0.36,1) infinite',
        'ripple-2':       'ripple 1.8s cubic-bezier(0.22,1,0.36,1) 0.55s infinite',
        'ripple-3':       'ripple 1.8s cubic-bezier(0.22,1,0.36,1) 1.1s infinite',
        'slide-up':       'slideUp 0.35s cubic-bezier(0.22,1,0.36,1)',
        'slide-down':     'slideDown 0.35s cubic-bezier(0.22,1,0.36,1)',
        'fade-in':        'fadeIn 0.25s ease-out',
        'field-updated':  'fieldUpdated 2s cubic-bezier(0.22,1,0.36,1) forwards',
        'danger-in':      'dangerIn 0.4s cubic-bezier(0.22,1,0.36,1)',
        'shield-pulse':   'shieldPulse 2.4s ease-in-out infinite',
        'ticker-in':      'tickerIn 0.3s cubic-bezier(0.22,1,0.36,1)',
        'check-pop':      'checkPop 0.45s cubic-bezier(0.22,1,0.36,1)',
        'spin-slow':      'spin 1.4s linear infinite',
      },
      keyframes: {
        orbIdle: {
          '0%,100%': { transform: 'scale(1)',    boxShadow: '0 0 0 0 rgba(15,118,110,0), 0 6px 24px rgba(15,118,110,0.14)' },
          '50%':     { transform: 'scale(1.04)', boxShadow: '0 0 0 10px rgba(15,118,110,0.07), 0 8px 36px rgba(15,118,110,0.22)' },
        },
        orbListen: {
          '0%,100%': { transform: 'scale(1)',    boxShadow: '0 0 0 8px rgba(16,185,129,0.10), 0 8px 40px rgba(16,185,129,0.22)' },
          '50%':     { transform: 'scale(1.07)', boxShadow: '0 0 0 20px rgba(16,185,129,0.06), 0 8px 56px rgba(16,185,129,0.34)' },
        },
        orbSpeak: {
          '0%,100%': { transform: 'scale(1)',    boxShadow: '0 0 0 8px rgba(79,70,229,0.10)' },
          '50%':     { transform: 'scale(1.05)', boxShadow: '0 0 0 20px rgba(79,70,229,0.05)' },
        },
        ripple: {
          '0%':   { transform: 'scale(1)', opacity: '0.55' },
          '100%': { transform: 'scale(2.1)', opacity: '0' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        slideDown: {
          '0%':   { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fieldUpdated: {
          '0%':   { backgroundColor: '#FEF3C7' },
          '40%':  { backgroundColor: '#D1FAE5' },
          '100%': { backgroundColor: 'transparent' },
        },
        dangerIn: {
          '0%':   { transform: 'translateY(-8px) scale(0.97)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)',        opacity: '1' },
        },
        shieldPulse: {
          '0%,100%': { transform: 'scale(1)',    opacity: '1' },
          '50%':     { transform: 'scale(1.08)', opacity: '0.9' },
        },
        tickerIn: {
          '0%':   { transform: 'translateY(6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
        checkPop: {
          '0%':   { transform: 'scale(0)' },
          '65%':  { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
