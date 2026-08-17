-- Phase 1: news のみ。seminar/profile/service 用テーブルは
-- tmp/cms-architecture.md の設計を土台に Phase 3/4 で別マイグレーションとして追加する。
--
-- 適用コマンド（Cloudflareアカウントとwrangler loginの準備ができてから実行する。
-- cms/README.md の手順を参照）:
--   cd cms/worker
--   npx wrangler d1 execute bitcraft-cms --remote --file=../migrations/0001_news.sql

CREATE TABLE IF NOT EXISTS news (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL,            -- 一覧に出すタグ文言（例: セミナー / サービス / お知らせ / メディア）
  published_at  TEXT NOT NULL,            -- 'YYYY-MM-DD'。表示はcms/worker側で'YYYY.MM.DD'に変換する
  list_desc     TEXT NOT NULL,            -- /news/ 一覧にだけ表示される概要文（トップページには出さない）
  body_html     TEXT NOT NULL,            -- 詳細ページ本文。h2/p/ul/li と <a> のみ許可（cms/worker/src/validation.tsでチェック）
  keywords      TEXT NOT NULL DEFAULT '', -- meta keywords に追加するカンマ区切りキーワード
  description   TEXT,                     -- meta description / og:description。NULLならlist_descから自動生成
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  show_on_top   INTEGER NOT NULL DEFAULT 1, -- 0にするとトップページの最新3件からは除外（一覧には残る）
  created_by    TEXT,                     -- 書き込んだMCPクライアント/エージェントの識別子
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_news_status_published_at
  ON news (status, published_at DESC);

-- 変更履歴（draft段階でのUndo・監査用。git履歴とは独立）
CREATE TABLE IF NOT EXISTS revisions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,   -- 'news'（Phase 3以降 'seminar' 等が増える）
  entity_id   INTEGER NOT NULL,
  diff_json   TEXT,
  actor       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
