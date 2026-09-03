/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        notion: {
          bg: '#f7f6f3',
          card: '#ffffff',
          sidebar: '#f1f1ef',
          border: '#e9e9e7',
          text: '#37352f',
          subtext: '#787774',
          darkBg: '#191919',
          darkCard: '#202020',
          darkBorder: '#2f3437',
          darkText: '#e3e2de',
          darkSubtext: '#9b9a97',
          // Notion Morandi palette
          tag: {
            purple: '#6940a5',
            purpleBg: '#f4f0f7',
            blue: '#337ea9',
            blueBg: '#e7f3f8',
            red: '#e03e3e',
            redBg: '#fbe4e4',
            orange: '#d9730d',
            orangeBg: '#faece3',
            green: '#448361',
            greenBg: '#edf3ec',
            yellow: '#cb912f',
            yellowBg: '#fbf3db',
          }
        },
        primary: {
          50: '#f4f0f7',
          100: '#ede8f5',
          200: '#d7cbe8',
          300: '#ba9ed6',
          400: '#9b71c2',
          500: '#6940a5', // Notion purple
          600: '#58368c',
          700: '#482c73',
          800: '#382259',
          900: '#281840',
        }
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Helvetica',
          '"Apple Color Emoji"',
          'Arial',
          'sans-serif',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          '"SF Mono"',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
}
