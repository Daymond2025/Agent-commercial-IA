import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        // Vert de marque WhatsApp Shop — #25d366
        neo: {
          DEFAULT:   '#25d366',
          dark:      '#1a9649',
          darker:    '#11622f',
          darkest:   '#0a371a',
          light:     '#77e7a1',
          bg:        '#edf8f1',
          border:    '#c9edd7',
        },
      },
      keyframes: {
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.25s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
