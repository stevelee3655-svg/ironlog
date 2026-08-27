/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nike: {
          canvas: '#ffffff',
          ink: '#111111',
          soft: '#f5f5f5',
          'soft-hover': '#eaeaea',
          hairline: '#cacacb',
          'hairline-soft': '#e5e5e5',
          charcoal: '#39393b',
          ash: '#4b4b4d',
          mute: '#707072',
          stone: '#9e9ea0',
          success: '#007d48',
          'success-bright': '#1eaa52',
          sale: '#d30005',
        },
        spacex: {
          bg: '#000000',
          soft: '#0a0a0a',
          card: '#111114',
          input: '#0d0d10',
          hairline: '#3a3a3f',
          white: '#ffffff',
          mute: '#f0f0fa',
          dim: '#5a5a5f',
        }
      },
      fontFamily: {
        nike: [
          '"Jost"',
          '"Noto Sans KR"',
          '"Helvetica Now Display Medium"',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
        display: [
          '"Jost"',
          '"Barlow Condensed"',
          '"D-DIN-Bold"',
          'Arial',
          'sans-serif'
        ],
        sans: [
          '"Jost"',
          '"Noto Sans KR"',
          'Arial',
          'sans-serif'
        ]
      },
      borderRadius: {
        'nike-pill': '9999px',
        'nike-md': '24px',
        'nike-sm': '18px'
      }
    },
  },
  plugins: [],
}
