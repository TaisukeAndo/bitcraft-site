# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## このリポジトリについて

`bitcraft.work`（GitHub Pages, legacy build, `CNAME` で独自ドメイン設定）として公開される、ビルドツール・パッケージマネージャ・テンプレートエンジンを一切持たない素朴な静的サイト。プレーンなHTML/CSS/バニラJS（+ jQuery 1.8.3, Lenis）のみで構成されている。

**`main` ブランチへのマージ＝即本番公開**（GitHub Actions等のCIは無い）。この事実がリポジトリ運用のあらゆるルールの前提になっている。

## コマンド

`package.json` は存在せず、build/lint/test の類のコマンドは無い。変更確認はHTMLファイルをブラウザで直接開くか、簡易HTTPサーバー（例: `python3 -m http.server`）で配信して目視確認する以外に手段がない。機械的な検証手段が無いことを前提に、変更後は関連ページを実際に開いてリンク・レイアウトを確認すること。

## Git運用

このリポジトリ専用のSkillが手順を持っているので、それに従うこと（勝手にmainへ直接コミット・pushしない）:
- ブランチ作成〜コミット〜push〜PR作成: `.claude/skills/create-pr/SKILL.md`
- PRのsquash merge〜本番反映〜ローカル追従: `.claude/skills/release-pr/SKILL.md`

CIが無くマージが即座に本番へ反映されるため、release-pr Skill内では「Draft/コンフリクト/openでない/base≠main」の場合にマージを止める安全確認を必ず行う。

## アーキテクチャ

### ページ構成とヘッダー/フッターの重複

トップの `index.html` は `#service` `#idea` `#news` `#about` `#contact` のアンカーセクションを持つ単一ページで、`contact/` `news/` `policy/` `service/` 配下は独立したサブページ。テンプレート共通化の仕組みが無いため、`<header>`（ナビゲーション）と `<footer>`（サイトマップ・SNSリンク）は全HTMLファイルに個別にコピーされている。ナビゲーションやフッターリンクを変更する場合は、該当する全ページ（現状8ファイル）を横断的に編集する必要がある。

各ページの `<head>` 以降には共通のスクリプト読み込み順がある: Lenis（スムーズスクロール, jsdelivr CDN）→ Font Awesome kit → jQuery 1.8.3（`ajax.googleapis.com`）→ `js/script.js`（Lenisの初期化・アンカースムーズスクロール・ハンバーガーメニュー開閉、共通ロジック）。新規ページを作る際もこの順序・構成を踏襲する。相対パス（`../js/script.js` 等）の深さはディレクトリ階層に応じて必ず調整する。

### CSS構成

`css/style.css`（全体共通・トップページ）、`css/subpage-style.css`（サブページ共通レイアウト）、`css/animation.css`（テキストスクロールアニメーション等）が共通で読み込まれ、各セクション/ページ固有のスタイルは同ディレクトリ内の専用CSS（例: `contact/contact-style.css`, `news/news-style.css`, `service/seminar/seminar-style.css`）に分離されている。

### フォーム送信はGoogleフォームへの直POST

`contact/contact-script.js` や `service/seminar/*/apply/apply-script.js` は、独自バックエンドを持たず `fetch(..., { mode: "no-cors" })` でGoogleフォームの `formResponse` エンドポイントに直接POSTしている。`no-cors` のためレスポンス内容を読めず、成否判定ができない（fetchが例外を投げない限り送信成功として扱い、送信完了メッセージを表示する仕組み）。新しいフォームを追加する場合もこのパターンを踏襲する。entry IDの対応関係は `.claude/skills/add-seminar/references/google-form-fields.md` を参照。

### `service/seminar/` — このリポジトリで最も複雑な領域

- `service/seminar/index.html` に「開催予定のセミナー」と「過去に開催したセミナー」の2セクションがあり、各セミナーはカード（`.seminar-card`）として並ぶ。開催日を過ぎたら「開催予定」→「過去開催」へ手動で移動し、バッジを「受付中」→「終了」に変える運用ルールがある（詳細は `.claude/skills/add-seminar/SKILL.md` のステップ2）。
- セミナーごとに `service/seminar/<slug>/` という独立フォルダを持ち、詳細ページ（`index.html`、HERO/TARGET/BENEFITS/TIMELINE/VOICES/SPEAKERS/OVERVIEW/FAQ/CTAの9セクション構成）・`apply/`（申込フォームページ）・`deadline.js`・`img/`（講師写真とOGP設定ファイル `ogp-config.json`）一式を持つ。既存の唯一の実例が `claude-code-1day/` で、新規セミナー追加時はこれをテンプレートとして丸ごとコピーする。
- `deadline.js` は詳細ページの `<meta name="event-date" content="YYYY-MM-DD">` を読み、開催日前日23:59:59を過ぎると詳細ページのCTAボタンと申込フォームを自動的にロックする（JSによるクライアントサイド制御のみで、サーバー側の締切強制は無い）。
- OGP画像は `.claude/skills/add-seminar/scripts/generate_ogp.py` に一本化されたスクリプトで生成する（各セミナーフォルダにはスクリプト本体を複製せず、`img/ogp-config.json` という設定JSONだけを持つ）。ヘッドレスChrome・Pillow・rembg（講師写真の背景除去）に依存するため、実行環境が無い場合は失敗する前提で扱う。
- 新規セミナー追加・既存セミナーの過去セクションへの移動は必ず `.claude/skills/add-seminar/SKILL.md` の手順に従う（一覧カードの追加だけでなく、詳細ページ・申込ページ・OGP画像・締切制御一式を含む「型」を崩さないため）。

### `.claude/skills/`

このリポジトリの運用ルール・非自明な手順はコードコメントではなくSkillとして明文化されている:
- `add-seminar`: セミナー追加・過去セクションへの移動の型
- `add-news`: お知らせ記事の追加（トップページ・一覧ページ・詳細ページの3箇所を同期する型）
- `create-pr`: ブランチ作成〜PR作成
- `release-pr`: PRのマージ〜本番反映

これらの領域を触る際は、Skillの手順を無視して場当たり的に編集しないこと。

### `.claude/agents/`

Skillとは別に、どのSkill・会話からもAgentツール（`subagent_type`）で呼び出せるサブエージェントを `.claude/agents/*.md` に置いている:
- `seo-optimizer`: サイト全体または指定ページのSEO状態（meta description・OGP・構造化データ（JSON-LD）・画像alt・sitemap.xml/robots.txt・URL正規化など）を監査し、実際にHTML/CSS/画像ファイルを修正するSEO専門エージェント。`add-seminar`・`add-news` は新規ページ作成の最終ステップでこのエージェントを呼び出し、生成直後の詳細ページ・記事ページにSEO対策を仕込む運用にしている。git commit/push・PR作成は一切行わないため、実装後も引き続き `create-pr` Skillでのブランチ化・PR作成が必要。

Skillと同様、担当範囲を無視した使い方（例: 呼び出し範囲を指定せず無関係な既存ページまでまとめて書き換えさせる）をしないこと。
