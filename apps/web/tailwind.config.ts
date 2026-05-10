import type { Config } from "tailwindcss";

const config = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        card: "var(--card)",
        soft: "var(--soft)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        brand: {
          DEFAULT: "var(--brand)",
          ink: "var(--brand-ink)",
          soft: "var(--brand-soft)",
          mid: "var(--brand-mid)",
        },
        red: {
          DEFAULT: "var(--red)",
          soft: "var(--red-soft)",
          ink: "var(--red-ink)",
        },
        ok: {
          DEFAULT: "var(--ok)",
          soft: "var(--ok-soft)",
          ink: "var(--ok-ink)",
        },
        warn: {
          DEFAULT: "var(--warn)",
          soft: "var(--warn-soft)",
          ink: "var(--warn-ink)",
        },
        bad: {
          DEFAULT: "var(--bad)",
          soft: "var(--bad-soft)",
          ink: "var(--bad-ink)",
        },
        info: "var(--info)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        "muted-foreground": "var(--muted-foreground)",
        "card-foreground": "var(--card-foreground)",
      },
      borderRadius: {
        "1": "var(--radius-1)",
        "2": "var(--radius-2)",
        "3": "var(--radius-3)",
        "4": "var(--radius-4)",
        pill: "999px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        serif: ["var(--font-instrument)", "Georgia", "serif"],
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "sm-warm": "var(--shadow-sm)",
        "md-warm": "var(--shadow-md)",
        "lg-warm": "var(--shadow-lg)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
