import type { Config } from "tailwindcss";
export default { content: ["./app/**/*.tsx"], theme: { extend: { fontFamily: { sans: ["var(--font)", "system-ui"] } } } } satisfies Config;
