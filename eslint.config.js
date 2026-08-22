// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // このESLint設定はモノレポ移行で新規に追加したコード（apps/, packages/,
    // scripts/）のみを対象にする。旧・静的サイト側のバニラJS（contact/, js/,
    // service/, news/, policy/ 配下等）はビルドツールを持たない前提で書かれて
    // おり対象外（Phase 9でのサイト移行完了後に削除される想定）。
    // apps/web/public/ 配下はそこからコピーしたWorkers Static Assets向けの
    // 静的ファイル（同じくビルドツール前提のバニラJS）なので同様に対象外。
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
      "apps/web/public/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
