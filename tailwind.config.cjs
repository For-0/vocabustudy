// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultTheme = require('tailwindcss/defaultTheme');

function getRgbVariable(name, defaultColor) {
    if (process.env.NODE_ENV !== "development") return `rgb(var(--color-${name}, ${defaultColor}) / <alpha-value>)`
    return `rgb(var(--color-${name}) / <alpha-value>)`
}

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
                primary: getRgbVariable("primary", "121 85 72"),
                secondary: getRgbVariable("secondary", "79 43 38"),
                'primary-alt': getRgbVariable("primary-alt", "138 96 81"),
                'primary-light': getRgbVariable("primary-light", "148 119 109"),
                'secondary-alt': getRgbVariable("secondary-alt", "166 115 96"),
            },
            fontFamily: {
                'sans': ["Raleway", ...defaultTheme.fontFamily.sans],
            },
            screens: {
                'md-both': { 'raw': '(min-height: 850px) and (min-width: 768px)' }
            }
        }
    },
    safelist: [
        // Colors for importing from quizlet
        "bg-yellow-100",
        "text-yellow-950",
        "bg-blue-100",
        "text-blue-950",
        "bg-purple-100",
        "text-purple-950",
    ],
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography')
    ],
    darkMode: "class"
}