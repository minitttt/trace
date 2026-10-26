import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202b",
        sage: "#8da4ff",
        mint: "#e6ebff",
        cream: "#f8f9fb",
        fog: "#f1f3f7",
        coral: "#e5866f",
        // CSS-variable tokens — automatically shift in dark mode
        bg: "var(--background)",
        fg: "var(--foreground)",
        surface: "var(--surface)",
        "surface-muted": "var(--surface-muted)",
        "border-token": "var(--border)",
        "border-muted": "var(--border-muted)",
        "text-muted": "var(--text-muted)",
        "text-subtle": "var(--text-subtle)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
      },
    },
  },
  plugins: [],
};

export default config;
