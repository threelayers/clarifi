import type { Config } from "tailwindcss";

export default {
  content: ["./ClariFi.dc.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sci: "#0071E3",
        sciGold: "#FFB340",
        ink: "#1D1D1F",
        paper: "#ECEFF3",
        line: "#DADADF"
      },
      fontFamily: {
        sans: ["Public Sans", "sans-serif"],
        serif: ["Source Serif 4", "serif"]
      },
      boxShadow: {
        soft: "0 12px 35px rgba(27, 27, 31, 0.10)"
      }
    }
  },
  plugins: []
} satisfies Config;
