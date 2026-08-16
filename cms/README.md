# bitcraft-site CMS（Phase 0 + Phase 1: news）

設計の全体像・判断理由は [`tmp/cms-architecture.md`](../tmp/cms-architecture.md) を参照。
このディレクトリは、そこで決めたロードマップの **Phase 0（土台）・Phase 1（newsのみ）** を実装したもの。

**✅ ローカルDocker環境では動作検証済み。⚠️ 本番デプロイ以降は未検証。**
`docker compose up worker` でMCPサーバーを起動し、実MCPプロトコル(Streamable HTTP)経由で
`create_news`/`list_news`/`update_news`/`get_news`（バリデーションエラー・404系も含む）・
ビルドスクリプトによるnews/以下とindex.htmlの再生成（既存記事と完全に同一の出力になることも確認済み）
まで一通り動作確認済み。一方、Cloudflareの実アカウントへの`wrangler deploy`・
`publish_news`からの実際のGitHub Actions起動は、この開発環境にCloudflare/GitHubの
認証情報が無いため未検証。「本番Cloudflareリソースの準備」以降を実施したら、そちらも確認すること。

途中で見つけて修正した実機起因の問題（参考）:
- `node:22-alpine`（musl libc）だと`workerd`のネイティブバイナリがspawnできず`ENOENT`になる
  → `node:22-bookworm-slim`（glibc）に変更
- `wrangler.toml`の`migrations`は`new_classes`ではなく`new_sqlite_classes`にしないと
  `McpAgent`が使うDurable ObjectのSQLiteストレージが有効化されず500エラーになる

seminar / profile / service はまだ対象外（Phase 3 / Phase 4 で追加予定）。

## 何が出来るようになるか

MCPクライアント（他のエージェント）から `create_news` / `update_news` / `publish_news` 等を呼ぶと:

1. Cloudflare D1の `news` テーブルにdraftとして保存される
2. `publish_news` を呼ぶと `status='published'` に更新され、GitHub Actions
   (`cms-news-build.yml`) が起動される
3. Actionsが `cms/worker` の内部API (`/internal/published-news`) 経由でDBの published記事全件を取得し、
   `news/<slug>/index.html`・`/news/` 一覧・`index.html` の `#news` セクションを再生成、
   ブランチを切って**Pull Requestを自動作成**する
4. 人間（または `release-pr` Skill）がPRをレビューしてmergeすると、GitHub Pagesに反映される

mainへの直接push・自動mergeは一切行わない。ビルドスクリプト(`cms/build/`)はCloudflareの
認証情報を直接持たず、必ず`cms/worker`を経由してDBを読む（ローカルDocker実行時はローカルD1、
本番Actions実行時はdeploy済みWorker経由のremote D1、と同じコードで両対応する）。

## ローカルではDockerで動かす

ホストにNode/wranglerを直接インストールする必要はない。**Cloudflareアカウントの準備が
まだでも、newsのCRUD・ビルドスクリプトの動作確認まではDockerだけで完結する**（wrangler dev は
D1などのbindingをデフォルトでローカルSQLiteとしてエミュレートするため）。

必要なもの: Docker / Docker Compose のみ。

```bash
cd cms
cp .env.example .env   # 値は空のままでもデフォルト(local-dev-token)で動く

# 1. MCPサーバーを起動（フォアグラウンド。ログを見ながら確認したいので別ターミナルでも可）
docker compose up worker
```

別ターミナルで:

```bash
cd cms

# 2. ローカルD1にスキーマ + 既存記事のseedを適用（初回のみ）
docker compose run --rm migrate

# 3. ビルドスクリプトを実行し、news/以下とindex.htmlを再生成
docker compose run --rm build

# リポジトリ本体（1つ上の階層）に生成結果が書き込まれる。差分を確認する:
cd .. && git diff
```

`docker compose run --rm build` は `cms/worker` に対してMCPの `create_news` / `publish_news` を
呼んでいなくても、`migrate` で投入した既存記事seedだけで一度動作確認できる。実際にMCP
クライアントから `create_news` → `publish_news` を叩いて確認したい場合は、`http://localhost:8787/mcp`
に `Authorization: Bearer local-dev-token`（`.env`で変更していなければ）で接続する。

`worker` コンテナはソースをbind mountしているので、`cms/worker/src/*.ts` を編集すると
`wrangler dev` が自動で再読み込みする。`node_modules` と `.wrangler`（ローカルD1のSQLite含む）は
名前付きvolumeに永続化されるので、`docker compose down` してもデータは消えない
（完全に作り直したい時は `docker compose down -v`）。

## 本番Cloudflareリソースの準備（実アカウントが必要な操作のみ）

ここから先は実際のCloudflareアカウントに対する操作。`wrangler login`のブラウザ認証は
コンテナ内では使えないため、**APIトークン方式**でDocker経由のまま進められるようにしてある。

1. Cloudflareダッシュボード > My Profile > API Tokens で、`D1:Edit` と `Workers Scripts:Edit`
   権限を持つカスタムトークンを発行する
2. `cms/.env` に設定する:
   ```
   CLOUDFLARE_API_TOKEN=...
   CLOUDFLARE_ACCOUNT_ID=...   # 複数アカウントを持っている場合は必須
   ```
3. D1データベースを作成する:
   ```bash
   cd cms
   docker compose run --rm wrangler d1 create bitcraft-cms
   ```
   出力される `database_id` を `cms/worker/wrangler.toml` の `REPLACE_WITH_D1_DATABASE_ID` に貼る。
4. 本番D1にスキーマ + seedを適用する（**`--remote`** を付ける。ローカルとは別のDBなので、
   `docker compose run --rm migrate` の`--local`実行だけでは本番に反映されない）:
   ```bash
   docker compose run --rm wrangler d1 execute bitcraft-cms --remote --file=../migrations/0001_news.sql
   docker compose run --rm wrangler d1 execute bitcraft-cms --remote --file=../migrations/0002_seed_existing_news.sql
   ```
   `0002` は既存の手書き記事（`news/ai-agent-1day-open/`）をDBへ取り込む1回限りのseed。
   **これを飛ばして最初のCMSビルドを走らせると、既存記事がトップページ・一覧から消えるので注意。**
5. Workerのsecretsを設定する（対話式。それぞれ実行してプロンプトに値を貼り付ける）:
   ```bash
   docker compose run --rm wrangler secret put MCP_BEARER_TOKEN   # 例: openssl rand -hex 32
   docker compose run --rm wrangler secret put GITHUB_TOKEN       # 下記6で作るPAT
   docker compose run --rm wrangler secret put GITHUB_REPO        # "TaisukeAndo/bitcraft-site"
   ```
6. GitHub側の準備:
   - Fine-grained PAT を発行（対象repo: `bitcraft-site`、権限: `Actions: write`, `Contents: write`,
     `Pull requests: write`）→ 上記5の `GITHUB_TOKEN` secretに設定
   - リポジトリの `Settings > Secrets and variables > Actions` に以下を追加:
     - `CMS_API_URL`（次のステップでdeployすると表示されるWorkerの公開URL）
     - `CMS_API_TOKEN`（5で設定した `MCP_BEARER_TOKEN` と同じ値）
   - `Settings > Actions > General > Workflow permissions` で
     **"Allow GitHub Actions to create and approve pull requests"** を有効化
     （`peter-evans/create-pull-request` がPRを作れるようにするため）
7. デプロイする:
   ```bash
   docker compose run --rm wrangler deploy
   ```
   表示されるURL（`https://bitcraft-cms.<account>.workers.dev`）を、6で設定した `CMS_API_URL`
   GitHub Secretと、MCPクライアントの接続先に使う（エンドポイントは `<URL>/mcp`）。

## ディレクトリ構成

```
cms/
  README.md                    このファイル
  docker-compose.yml            ローカル開発環境（worker/migrate/build/wrangler の4サービス）
  .env.example                  docker-compose用の環境変数テンプレート（.envはgitignore対象）
  migrations/
    0001_news.sql                 newsテーブル等のスキーマ（Phase 1）
    0002_seed_existing_news.sql   既存記事の取り込みseed（1回限り）
  worker/                       Remote MCPサーバー（Cloudflare Workers, TypeScript）
    Dockerfile, docker-entrypoint.sh, .dev.vars.example   ローカルDocker実行用
    src/index.ts                  tool定義 + /internal/published-news（build.mjs用の内部API）
    src/db.ts                     D1クエリ
    src/validation.ts             zodスキーマ + 簡易HTMLタグ許可リスト
    src/auth.ts                   Bearer認証
    src/github.ts                 GitHub Actions workflow_dispatch起動
  build/                        GitHub Actions / Dockerから呼ばれるビルドスクリプト（Node、追加依存なし）
    build.mjs                     cms/worker経由でnews一覧取得 -> news/以下 + index.html#news を再生成
    lib/cms-api.mjs               cms/workerの /internal/published-news クライアント
    templates/                    一覧用/トップページ用の記事フラグメント
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
- `preview_build` tool（現状は `docker compose run --rm build` でのローカル確認、またはPRのdiffで代用）
- R2への画像アップロードtool（news本文では現状画像添付を想定していない）
- CLAUDE.mdへのこのCMSサブシステムの追記（実装が一通り動作確認できてから反映する）

## このscaffoldをリポジトリに取り込む際の注意

このリポジトリの運用ルール上、`main`へのマージは即本番公開になる。この `cms/` 一式・
`.github/workflows/cms-news-build.yml`・`index.html` / `news/index.html` のマーカー追加は
**サイトの見た目を一切変えない**（`git diff`で確認済み: マーカーはHTMLコメントのみ）ので
merge自体のリスクは低いが、通常通り `create-pr` Skillでブランチ化してPRにすること。
実際にCMS経由でnewsを公開する前に、上記セットアップ手順を必ず終わらせておくこと。
