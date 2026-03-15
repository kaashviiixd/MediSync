/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                mediblue: {
                    light: '#014d8b',
                    DEFAULT: '#003366',
                    dark: '#001f3f',
                },
                mediteal: {
                    light: '#00d2d3',
                    DEFAULT: '#00b7cb',
                    dark: '#008b8b',
                }
            },
            backgroundImage: {
                'medical-gradient': 'linear-gradient(135deg, #014d8b 0%, #00b7cb 100%)',
            }
        },
    },
    plugins: [],
}
