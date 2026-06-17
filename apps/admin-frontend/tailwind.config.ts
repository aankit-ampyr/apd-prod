import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/react-common/src/**/*.{ts,tsx,css}"
  ]
} satisfies Config