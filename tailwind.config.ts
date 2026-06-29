import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        neo: {
          DEFAULT:   'oklch(.67 .22 144.33)',
          dark:      'oklch(.48 .20 144.33)',
          darker:    'oklch(.32 .16 144.33)',
          darkest:   'oklch(.20 .10 144.33)',
          light:     'oklch(.82 .14 144.33)',
          bg:        'oklch(.95 .04 144.33)',
          border:    'oklch(.88 .08 144.33)',
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
