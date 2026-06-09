import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        daymond: {
          blue: '#1e40af',
          green: '#16a34a',
        },
      },
    },
  },
  plugins: [],
};

export default config;