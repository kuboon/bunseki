import type { Config } from "tailwindcss";
import daisyui from "npm:daisyui@4";

export default {
  content: [
    "./**/*.{html,tsx,ts,jsx,js}",
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: ["dark", "light"],
    darkTheme: "dark",
  },
} satisfies Config;
