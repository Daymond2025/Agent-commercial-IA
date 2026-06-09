import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        neo: {
          green:       'oklch(.67 .22 144.33)',
          'green-light':'oklch(.85 .15 144.33)',
          'green-dark': 'oklch(.50 .22 144.33)',
          'green-bg':   'oklch(.96 .04 144.33)',
        },
        daymond: {
          blue:  '#0B1739',
          navy:  '#0f1c3f',
        },
      },
    },
  },
  plugins: [],
};

export default config;
