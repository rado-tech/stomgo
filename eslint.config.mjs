import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    // eslint-config-next standart e'tiborsizliklari
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Yaratilgan va tashqi fayllar — biz yozmaymiz, tekshirmaymiz
    "public/maplibre/**",     // MapLibre worker nusxasi (minifikatsiya qilingan)
    "public/sw.js",           // brauzer service worker'i
    "mobile/android/**",      // Gradle yig'ilishi
    "mobile/ios/**",
    "mobile/.expo/**",
    "uploads/**",
    "backups/**",
    "coverage/**",
  ]),

  // Mobil ilova — React Native, brauzer emas.
  // Veb uchun mo'ljallangan qoidalar bu yerda ma'noga ega emas.
  {
    files: ["mobile/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "jsx-a11y/alt-text": "off",              // RN <Image> — HTML <img> emas
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
