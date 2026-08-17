# bitcraft-site CMS（Phase 0 + Phase 1: news, 動的レンダリング版）

設計の全体像・判断理由は [`tmp/cms-architecture.md`](../tmp/cms-architecture.md) を参照。
このディレクトリは、そこで決めたロードマップの **Phase 0（土台）・Phase 1（newsのみ）** を実装したもの。

**このCMSは静的サイトジェネレータ方式ではなく、動的レンダリング方式。**
`publish_news` を呼ぶとDBが更新され、**次のリクエストから即座に本番へ反映される**
（ビルド・Pull Request・GitHub Pagesへの再デプロイは一切発生しない。git操作もゼロ）。
`news/` 配下の静的HTMLファイルは今も残っているが、本番でCloudflare Routeが有効になった後は
オリジンとして参照されなくなる「過去の名残」になる（動作の詳細は後述）。

**✅ ローカルDocker環境では動作検証済み。⚠️ 本番Cloudflare Route登録・DNS切替は未検証。**
`docker compose up worker` でWorker（MCP + 動的SSR）を起動し、実MCPプロトコル経由の
`create_news`→`publish_news`が呼び出した瞬間から `/news/` `/news/<slug>/` `/`（の#news部分）に
反映されることまで確認済み。一方、Cloudflareの実アカウントへの`wrangler deploy`・実際のRoute登録・
DNS切替は、この開発環境にCloudflare認証情報が無いため未検証。

途中で見つけて修正した実機起因の問題（参考）:
- `node:22-alpine`（musl libc）だと`workerd`のネイティブバイナリがspawnできず`ENOENT`になる
  → `node:22-bookworm-slim`（glibc）に変更
- `wrangler.toml`の`migrations`は`new_classes`ではなく`new_sqlite_classes`にしないと
  `McpAgent`が使うDurable ObjectのSQLiteストレージが有効化されず500エラーになる
- docker-composeの`environment:`で渡した値は、そのままではwrangler devの`env.X`バインディングに
  乗らない（`.dev.vars`として書き出す必要がある）
- `wrangler.toml`の`[[rules]] type = "Text"`で`.html`をimportする方式は実際にバンドル・実行できる
  ことを確認済み

seminar / profile / service はまだ対象外（Phase 3 / Phase 4 で追加予定）。

## アーキテクチャ

```
他エージェント --MCP--> cms/worker (/mcp)  --> D1書き込み(draft/published)

訪問者のブラウザ --HTTP--> cms/worker
  ├─ "/"            -> オリジン(GitHub Pages)のindex.htmlを取得し、#newsセクションだけ
  │                     D1の最新3件で書き換えて返す（HTMLRewrite的なパッチ処理）
  ├─ "/news", "/news/"        -> D1のpublished全件からその場でHTML生成(SSR)して返す
  ├─ "/news/<slug>/"          -> D1の該当行からその場でHTML生成(SSR)して返す。無ければ404
  └─ それ以外すべて            -> オリジン(GitHub Pages)へ素通し（Worker側では何もしない）
```

`cms/worker`が1つで「MCPサーバー」と「newsページの動的レンダラー」を兼ねる。ビルドスクリプトや
GitHub Actions・Pull Requestは存在しない（Phase 1の前バージョンにはあったが、動的レンダリング方式への
移行に伴い削除した）。

## 何が出来るようになるか

MCPクライアント（他のエージェント）から:

1. `create_news` でDBに`draft`として保存
2. `update_news` で内容を編集
3. `publish_news` を呼ぶと`status='published'`に更新される。**この瞬間から**
   `https://bitcraft.work/news/` `https://bitcraft.work/news/<slug>/` およびトップページの
   `#news`セクションに反映される（キャッシュを考慮しなければ次のリクエストから）

`main`ブランチや`git`は一切介在しない。CLAUDE.mdが定める「mainマージ＝即本番公開」という
リスクの高い操作の対象にはならない（そのかわり、DB書き込みが直接本番相当になるという別種の
重みを持つ操作になる。MCPサーバーへのアクセス制御（Bearerトークン）が唯一のゲートになる点に注意）。

## ローカルではDockerで動かす

ホストにNode/wranglerを直接インストールする必要はない。**Cloudflareアカウントの準備が
まだでも、動的レンダリングも含めて全部Dockerだけで完結する**（wrangler devがD1などの
bindingをデフォルトでローカルSQLiteとしてエミュレートするため）。

必要なもの: Docker / Docker Compose のみ。

```bash
cd cms
cp .env.example .env   # 値は空のままでもデフォルト(local-dev-token)で動く

# 1. static-origin（このリポジトリ自身を静的配信する、本番GitHub Pagesの代役）と
#    worker（MCP + 動的SSR）を起動
docker compose up static-origin worker
```

別ターミナルで:

```bash
cd cms

# 2. ローカルD1にスキーマ + 既存記事のseedを適用（初回のみ）
docker compose run --rm migrate

# 3. 動作確認
curl http://localhost:8787/news/                      # SSRされた一覧ページ
curl http://localhost:8787/news/ai-agent-1day-open/    # SSRされた詳細ページ
curl http://localhost:8787/ | grep -A6 CMS:NEWS:TOP    # #newsセクションだけ書き換わったトップページ
curl -I http://localhost:8787/contact/                 # CMS管理下でないパスはstatic-originへ素通し
```

実際にMCPクライアントから`create_news`→`publish_news`を叩いて確認する場合は、
`http://localhost:8787/mcp` に `Authorization: Bearer local-dev-token`（`.env`で変更していなければ）
で接続する。`publish_news`を呼んだ直後に`curl http://localhost:8787/news/<slug>/`を叩けば、
ビルドもデプロイも挟まず即座に反映されていることが確認できる。

`worker`コンテナはソースをbind mountしているので、`cms/worker/src/*.ts`や`cms/worker/templates/*.html`
を編集すると`wrangler dev`が自動で再読み込みする。ただし**`Dockerfile`や`docker-entrypoint.sh`を
編集した場合は`docker compose build worker`が必要**（イメージに焼き込まれているため、bind mountでは
反映されない）。`node_modules`と`.wrangler`（ローカルD1のSQLite含む）は名前付きvolumeに永続化されるので、
`docker compose down`してもデータは消えない（完全に作り直したい時は`docker compose down -v`）。

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
   **これを飛ばしてRouteを有効化すると、既存記事がトップページ・一覧から消えるので注意。**
5. Workerのsecretを設定する（対話式）:
   ```bash
   docker compose run --rm wrangler secret put MCP_BEARER_TOKEN   # 例: openssl rand -hex 32
   ```
6. デプロイする（この時点ではまだ`*.workers.dev`のURLのみで、独自ドメインには紐付かない）:
   ```bash
   docker compose run --rm wrangler deploy
   ```
   表示されるURL（`https://bitcraft-cms.<account>.workers.dev`）で、`/mcp`・`/news/`等が
   正しく動くことを確認する。MCPクライアントの接続先にもこのURL（+`/mcp`）を使う。

## 独自ドメインへの適用（DNS/Route切替 — 本番影響あり・要注意）

ここまでは`*.workers.dev`のURL上での検証。実際に`bitcraft.work`で動かすには:

1. **`bitcraft.work`のDNS管理をCloudflareに移す**（レジストラ側でネームサーバーをCloudflareの
   ものに変更する、または既にCloudflareでDNS管理している場合は該当レコードを「プロキシ済み
   （オレンジ雲）」にする）。これは本番ドメインに影響する変更で、**ユーザー自身の操作が必要**
   （このセッションからは実行できない）。GitHub Pages側の既存のDNS設定（CNAME等）はそのまま残す
   （Cloudflareがその手前に入るだけで、実体はGitHub Pagesのまま）。
2. DNSがCloudflareで有効になったら、`cms/worker/wrangler.toml`の`[[routes]]`セクションの
   コメントアウトを外し、`docker compose run --rm wrangler deploy`を再実行する。これで
   `bitcraft.work/`・`/news`・`/news/*`・`/mcp`へのアクセスがこのWorkerを経由するようになる。
3. GitHub Pagesの証明書問題（`bad_authz`、期限 2026-08-25）は、Cloudflare Universal SSLが
   有効化されれば副次的に解消される見込みだが、実際に切り替えて確認すること。

## ディレクトリ構成

```
cms/
  README.md                    このファイル
  docker-compose.yml            ローカル開発環境（worker/static-origin/migrate/wrangler の4サービス）
  .env.example                  docker-compose用の環境変数テンプレート（.envはgitignore対象）
  migrations/
    0001_news.sql                 newsテーブル等のスキーマ（Phase 1）
    0002_seed_existing_news.sql   既存記事の取り込みseed（1回限り）
  worker/                       Worker本体（Cloudflare Workers, TypeScript）
    Dockerfile, docker-entrypoint.sh, .dev.vars.example   ローカルDocker実行用
    wrangler.toml                  D1/Durable Object/Text-module rule/Route（コメントアウト）
    templates/                     news関連ページのHTMLテンプレート
                                    (news-detail.htmlは.claude/skills/add-news/assets/detail-template.html
                                     の複製。手動編集時は両方に反映すること)
    src/index.ts                   ルーティング（/mcp, /, /news, /news/<slug>/, 素通し）+ tool定義
    src/render.ts                  D1の行 -> HTML のレンダリング（テンプレート差し込み・マーカー置換）
    src/db.ts                      D1クエリ
    src/validation.ts              zodスキーマ + 簡易HTMLタグ許可リスト
    src/auth.ts                    /mcp用のBearer認証
```

`index.html` と `news/index.html` の `<!-- CMS:NEWS:TOP:START -->` / `<!-- CMS:NEWS:LIST:START -->`
マーカーコメントは、動的レンダリング方式でも引き続き使われる（`render.ts`のpatchHomepageNewsが
これを目印に`#news`セクションを書き換える）。`news/index.html`側のマーカーは今のところ未使用
（一覧ページ自体をSSRで丸ごと生成するため）だが、当面残しておく。

## MCP tool 一覧（Phase 1時点）

| tool | 概要 |
|---|---|
| `list_news` | 一覧取得（`status`でdraft/publishedを絞り込み） |
| `get_news` | slug指定で1件取得 |
| `create_news` | draftとして新規作成 |
| `update_news` | 既存記事を部分更新 |
| `publish_news` | published化。**呼んだ瞬間から本番に反映される**（ビルド・PR不要） |

`create_news` / `update_news` の引数スキーマは `.claude/skills/add-news/SKILL.md` が定義している
運用ルール（slugはkebab-case、トップページは最新3件まで、等）と対応させてある。

## 既知の未実装・今後やること

- seminar / profile / service 用のtool・テーブル・テンプレート（Phase 3 / Phase 4、
  `tmp/cms-architecture.md` のロードマップ参照）
- MCPクライアントごとの個別トークン発行・actor識別（今は `created_by` が固定文字列）
- publishの取り消し（unpublish）tool（現状は`update_news`で`status: "draft"`に戻せば同等の効果）
- キャッシュ戦略（現状D1に毎リクエストアクセスする。無料枠内で十分間に合う想定だが、
  アクセスが増えたらCache APIやCDNキャッシュの追加を検討する）
- R2への画像アップロードtool（news本文では現状画像添付を想定していない）
- CLAUDE.mdへのこのCMSサブシステムの追記（実際にCloudflare Routeを有効化してから反映する）

## このscaffoldをリポジトリに取り込む際の注意

`cms/`一式・`index.html` / `news/index.html`のマーカー追加は**サイトの見た目を一切変えない**
（`git diff`で確認済み: マーカーはHTMLコメントのみ）ので、この状態でmainにmergeしても
本番の見た目・動作は変わらない（Cloudflare Routeを有効化するまでは`cms/`は存在するだけで
何も本番に影響しない）。通常通り`create-pr` Skillでブランチ化してPRにすること。

ただし、**独自ドメインへのRoute適用（前述の「独自ドメインへの適用」セクション）は本番ドメインへの
実際の変更を伴う**ため、このリポジトリへのmerge作業とは別に、必ず事前にユーザーへ確認してから
進めること。
