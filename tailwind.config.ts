import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        neo: {
          // Vert principal Neo — oklch(.67 .22 144.33)
          DEFAULT:   'oklch(.67 .22 144.33)',
          dark:      'oklch(.48 .20 144.33)',   // hover boutons, textes foncés
          darker:    'oklch(.32 .16 144.33)',   // sidebar sombre
          darkest:   'oklch(.20 .10 144.33)',   // fond sidebar très foncé
          light:     'oklch(.82 .14 144.33)',   // accents clairs
          bg:        'oklch(.95 .04 144.33)',   // fond badge / card léger
          border:    'oklch(.88 .08 144.33)',   // bordures vertes légères
        },
      },
    },
  },
  plugins: [],
};

export default config;
