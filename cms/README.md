# bitcraft-site CMS（Phase 0 + Phase 1: news）

設計の全体像・判断理由は [`tmp/cms-architecture.md`](../tmp/cms-architecture.md) を参照。
このディレクトリは、そこで決めたロードマップの **Phase 0（土台）・Phase 1（newsのみ）** を実装したもの。

**⚠️ 現状は未検証のscaffoldです。** この開発環境にはCloudflareアカウントの認証情報が無く、
`wrangler`もインストールされていない（`npm`のキャッシュ権限が壊れていて `npx wrangler` 自体が
今は動かない）ため、コード自体をこの場で実行・デプロイして確認することができていない。
下記手順に沿ってあなたの環境で `npm install` → `wrangler dev` → 実デプロイまで動かし、
動作確認してから本番のMCPクライアントに接続すること。

seminar / profile / service はまだ対象外（Phase 3 / Phase 4 で追加予定）。

## 何が出来るようになるか

MCPクライアント（他のエージェント）から `create_news` / `update_news` / `publish_news` 等を呼ぶと:

1. Cloudflare D1の `news` テーブルにdraftとして保存される
2. `publish_news` を呼ぶと `status='published'` に更新され、GitHub Actions
   (`cms-news-build.yml`) が起動される
3. Actionsが D1 の published記事全件から `news/<slug>/index.html`・`/news/` 一覧・
   `index.html` の `#news` セクションを再生成し、ブランチを切って**Pull Requestを自動作成**する
4. 人間（または `release-pr` Skill）がPRをレビューしてmergeすると、GitHub Pagesに反映される

mainへの直接push・自動mergeは一切行わない。

## セットアップ手順（あなたの環境で実行する）

### 0. 前提を直す

このマシンの `npm` キャッシュがrootの所有物件で壊れている（`wrangler`実行時にEACCESで失敗する）。
一度だけ直す必要がある:

```bash
sudo chown -R 501:20 "/Users/ando/.npm"
```

### 1. Cloudflareアカウント・wrangler

```bash
cd cms/worker
npm install
npx wrangler login          # ブラウザでCloudflareアカウントにログイン
```

### 2. D1データベースを作る

```bash
npx wrangler d1 create bitcraft-cms
```

出力される `database_id` を `cms/worker/wrangler.toml` の
`REPLACE_WITH_D1_DATABASE_ID` に貼り付ける。

### 3. スキーマ適用 + 既存記事のseed

```bash
npx wrangler d1 execute bitcraft-cms --remote --file=../migrations/0001_news.sql
npx wrangler d1 execute bitcraft-cms --remote --file=../migrations/0002_seed_existing_news.sql
```

`0002` は既存の手書き記事（`news/ai-agent-1day-open/`）をDBに取り込むための1回限りのseed。
**これを実行せずに最初のCMSビルドを走らせると、既存記事がトップページ・一覧から消えるので注意。**

### 4. Workerのsecretsを設定

```bash
npx wrangler secret put MCP_BEARER_TOKEN   # 例: openssl rand -hex 32 で生成した値を貼る
npx wrangler secret put GITHUB_TOKEN       # 下記5で作るPAT
npx wrangler secret put GITHUB_REPO        # "TaisukeAndo/bitcraft-site"
```

### 5. GitHub側の準備

- Fine-grained PAT を発行（対象repo: `bitcraft-site`、権限: `Actions: write`, `Contents: write`, `Pull requests: write`）
  → Worker の `GITHUB_TOKEN` secretに設定（上記4）
- リポジトリの `Settings > Secrets and variables > Actions` に以下を追加:
  - `CF_ACCOUNT_ID`
  - `CF_D1_DATABASE_ID`（wrangler.tomlに書いたのと同じdatabase_id）
  - `CF_API_TOKEN`（D1への読み取り権限を持つCloudflare APIトークン。Cloudflareダッシュボード
    > My Profile > API Tokens で `D1:Edit` 権限のカスタムトークンを作成する）
- リポジトリの `Settings > Actions > General > Workflow permissions` で
  **"Allow GitHub Actions to create and approve pull requests"** を有効化
  （`peter-evans/create-pull-request` がPRを作れるようにするため）

### 6. ローカルで動作確認してからdeploy

```bash
cd cms/worker
npx wrangler dev              # ローカルでMCPサーバーを起動し、tool呼び出しを試す
npx wrangler deploy           # 問題なければ本番デプロイ
```

デプロイ後に表示されるURL（`https://bitcraft-cms.<account>.workers.dev/mcp`）が
MCPクライアントの接続先。`Authorization: Bearer <MCP_BEARER_TOKEN>` ヘッダが必須。

### 7. ビルドスクリプト単体の動作確認（任意）

Actions無しでローカルからD1に対してビルドを試すこともできる:

```bash
CF_ACCOUNT_ID=... CF_D1_DATABASE_ID=... CF_API_TOKEN=... node cms/build/build.mjs
git diff   # news/以下とindex.htmlの差分を確認してからcommitするかどうか判断する
```

`cms/build/` は追加npm依存が無いので `npm install` 不要（Node組み込みのfetch/fsのみ使用）。

## ディレクトリ構成

```
cms/
  README.md                    このファイル
  migrations/
    0001_news.sql               newsテーブル等のスキーマ（Phase 1）
    0002_seed_existing_news.sql 既存記事の取り込みseed（1回限り）
  worker/                       Remote MCPサーバー（Cloudflare Workers, TypeScript）
    src/index.ts                 tool定義: list_news / get_news / create_news / update_news / publish_news
    src/db.ts                    D1クエリ
    src/validation.ts            zodスキーマ + 簡易HTMLタグ許可リスト
    src/auth.ts                  Bearer認証
    src/github.ts                GitHub Actions workflow_dispatch起動
  build/                        GitHub Actionsから呼ばれるビルドスクリプト（Node、追加依存なし）
    build.mjs                    D1 -> news/以下 + index.html#news を再生成
    lib/d1.mjs                   D1 REST APIラッパー
    templates/                   一覧用/トップページ用の記事フラグメント
                                  （詳細ページ本体は .claude/skills/add-news/assets/detail-template.html を流用）
.github/workflows/
  cms-news-build.yml            build.mjs実行 + smoke test + PR自動作成
```

`index.html` と `news/index.html` には `<!-- CMS:NEWS:TOP:START -->` /
`<!-- CMS:NEWS:LIST:START -->` のマーカーコメントを追加済み。この間はbuild.mjsが
上書きするので手編集しないこと（マーカーの外側は今まで通り自由に手編集してよい）。

## MCP tool 一覧（Phase 1時点）

| tool | 概要 |
|---|---|
| `list_news` | 一覧取得（`status`でdraft/publishedを絞り込み） |
| `get_news` | slug指定で1件取得 |
| `create_news` | draftとして新規作成 |
| `update_news` | 既存記事を部分更新 |
| `publish_news` | published化 + GitHub Actionsビルド起動（PR自動作成） |

`create_news` / `update_news` の引数スキーマは `.claude/skills/add-news/SKILL.md` が定義している
運用ルール（slugはkebab-case、トップページは最新3件まで、等）と対応させてある。

## 既知の未実装・今後やること

- seminar / profile / service 用のtool・テーブル・テンプレート（Phase 3 / Phase 4、
  `tmp/cms-architecture.md` のロードマップ参照）
- MCPクライアントごとの個別トークン発行・actor識別（今は `created_by` が固定文字列）
- `preview_build` tool（現状は `wrangler dev` でのローカル確認、またはPRのdiffで代用）
- R2への画像アップロードtool（news本文では現状画像添付を想定していない）
- CLAUDE.mdへのこのCMSサブシステムの追記（実装が一通り動作確認できてから反映する）

## このscaffoldをリポジトリに取り込む際の注意

このリポジトリの運用ルール上、`main`へのマージは即本番公開になる。この `cms/` 一式・
`.github/workflows/cms-news-build.yml`・`index.html` / `news/index.html` のマーカー追加は
**サイトの見た目を一切変えない**（`git diff`で確認済み: マーカーはHTMLコメントのみ）ので
merge自体のリスクは低いが、通常通り `create-pr` Skillでブランチ化してPRにすること。
実際にCMS経由でnewsを公開する前に、上記セットアップ手順を必ず終わらせておくこと。
