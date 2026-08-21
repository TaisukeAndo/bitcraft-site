// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // このESLint設定はモノレポ移行で新規に追加したコード（apps/, packages/,
    // scripts/）のみを対象にする。旧・静的サイト側のバニラJS（contact/, js/,
    // service/, news/, policy/ 配下等）はビルドツールを持たない前提で書かれて
    // おり対象外（Phase 9でのサイト移行完了後に削除される想定）。
    ignores: [
      "**/dist/**",
      "**/.wrangler/**",
      "**/node_modules/**",
      "**/worker-configuration.d.ts",
      "contact/**",
      "css/**",
      "image/**",
      "js/**",
      "news/**",
      "policy/**",
      "service/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
