import { type Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: ["./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                background: "linear-gradient(135deg, #0f0f1c, #1a133c)",
                neonPink: "#ff4ecd",
                neonBlue: "#00c6ff",
                deepPurple: "#5e4b8b",
            },
            fontFamily: {
                futuristic: ['Orbitron', 'sans-serif'],
                modern: ['Poppins', 'sans-serif'],
            },
            boxShadow: {
                neon: "0 0 10px #b829f7, 0 0 20px #b829f7",
                glow: "0 0 5px #00c6ff, 0 0 20px #00c6ff",
            },
            backgroundImage: {
                'stars': "url('/stars.svg')",
                'radial': "radial-gradient(ellipse at top left, #1c1c3c, #0f0f1c)",
            },
        },
    },
    plugins: [],
};
export default config;
