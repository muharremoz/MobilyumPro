import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code worktree'leri: projenin kopyaları + kendi .next'leri.
    // Yukarıdaki ".next/**" kök dizine göre çözüldüğü için onları kapsamaz.
    ".claude/**",
  ]),
]);

export default eslintConfig;
