import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/components/**/*.{js,ts,jsx,tsx,mdx}', './src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#00ff88',
        'primary-light': '#33ffa3',
        'primary-dark': '#00cc6e',
        secondary: '#ff8a3c',
        'secondary-light': '#ffa666',
        'secondary-dark': '#e67320',
        dark: {
          DEFAULT: '#0a0a1a',
          card: '#0f0f1a',
          muted: '#1a1a2e',
          border: 'rgba(255,255,255,0.08)',
          hover: 'rgba(255,255,255,0.12)',
        },
      },
      backgroundColor: {
        dark: '#0a0a1a',
        card: '#0f0f1a',
        muted: '#1a1a2e',
      },
      borderColor: {
        dark: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          hover: 'rgba(255,255,255,0.12)',
        },
      },
      boxShadow: {
        neon: '0 0 20px rgba(0, 255, 136, 0.3)',
        'neon-lg': '0 0 30px rgba(0, 255, 136, 0.4)',
        'neon-xl': '0 0 40px rgba(0, 255, 136, 0.5)',
        card: '0 4px 24px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.4)',
      },
      borderRadius: {
        card: '0.75rem',
        'card-lg': '1rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { textShadow: '0 0 5px #00ff88, 0 0 10px #00ff88' },
          '100%': { textShadow: '0 0 15px #00ff88, 0 0 25px #00ff88' },
        },
      },
    },
  },
  plugins: [],
}

export default config
