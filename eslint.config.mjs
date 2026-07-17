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
  {
    rules: {
      /**
       * "Sheet/dialog açılınca formu kayda göre sıfırla" kalıbı (kalan ~24
       * ihlalin tamamı) bu kuralı ihlal ediyor ama DOĞRU çalışıyor. React'ın
       * önerdiği `key` ile remount alternatifinin iki varyantı da regresyon
       * üretiyor:
       *   key={item.id}              → aynı kaydı kaydetmeden kapatıp tekrar
       *                                açınca eski düzenleme kalıntısı kalır
       *   key={open ? item.id : "-"} → kapanma animasyonu sırasında alanlar
       *                                gözle görülür şekilde boşalır
       *
       * Gerçekten çözülebilir olanlar zaten düzeltildi: harici kaynaklar
       * useSyncExternalStore'a (use-mobile, app-nav, error-shake), prop→state
       * aynalaması usePropAynasi'ya (19 yer) alındı — 48'den 24'e indi.
       *
       * warning: yeni ihlaller görünür kalsın, ama lint bu kalıp yüzünden
       * kırmızı olmasın.
       */
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
