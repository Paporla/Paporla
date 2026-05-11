import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00ff88',     // Verde neón
        secondary: '#ff8a3c',    // Naranja (se mantiene)
        'primary-dark': '#00cc6e', // Verde más oscuro para hover
        'primary-glow': 'rgba(0, 255, 136, 0.3)', // Glow del verde
      },
      backgroundColor: {
        dark: '#0a0a0f',
        card: '#111827',
      },
      boxShadow: {
        'neon': '0 0 20px rgba(0, 255, 136, 0.3)',
        'neon-lg': '0 0 30px rgba(0, 255, 136, 0.4)',
        'neon-xl': '0 0 40px rgba(0, 255, 136, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
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