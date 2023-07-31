// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './index.html',
        './src/**/*.{vue,js}'
    ],
    theme: {
        extend: {
            colors: {
                // The default values for var() should theoretically never be used at runtime (the variables are defined in main.css) but they are used by Tailwind CSS Intellisense.
                primary: 'rgb(var(--color-primary, 121 85 72) / <alpha-value>)',
                secondary: 'rgb(var(--color-secondary, 79 43 38) / <alpha-value>)',
                'primary-alt': 'rgb(var(--color-primary-alt, 138 96 81) / <alpha-value>)',
                'secondary-alt': 'rgb(var(--color-secondary-alt, 166 115 96) / <alpha-value>)',
            },
            fontFamily: {
                'sans': ["Raleway", ...defaultTheme.fontFamily.sans],
            }
        }
    },
    darkMode: "class"
  }