---
name: add-seminar
description: bitcraft-site の service/seminar ページに新しいセミナー・ワークショップを追加する。一覧ページへのカード追加だけでなく、既存の claude-code-1day を土台にした詳細ページ（HERO/TARGET/BENEFITS/TIMELINE/VOICES/SPEAKERS/OVERVIEW/FAQ/CTA）・申込みフォームページ・OGP画像・残席/募集期限スクリプト一式を新規生成し、開催日を過ぎた既存の「開催予定」セミナーは自動で「過去に開催したセミナー」セクションへ移動する。ユーザーが「セミナーを追加して」「新しいセミナーのLP（ランディングページ）を作って」「セミナー一覧に〇〇を載せて」「ワークショップのページを作成して」のように言った時、または service/seminar/ 配下にファイルを追加・編集しようとしている時は、既存の1件だけを真似て場当たり的に編集するのではなく、必ずこのSkillの手順に従うこと。
---

# セミナーページへのセミナー追加

## なぜこの手順が必要か

`service/seminar/` は素朴な静的HTMLで、ビルドもテンプレートエンジンも無い。今のところ実例は `claude-code-1day/` の1件だけだが、そこには「一覧ページのカード」「詳細ページの9セクション」「申込みフォーム（Googleフォーム連携）」「OGP画像生成スクリプト」「募集期限の自動制御」という、暗黙のうちに確立された一つの型が存在する。次のセミナーを追加するときにこの型を外すと、サイト全体としての一貫性（デザイン・SEOタグ・募集終了時の自動制御など）が崩れる。このSkillは、その型を毎回正確に複製し、かつ「開催日が過ぎたら過去セクションへ移す」という репositoryの運用ルールも一緒に実行するためのものである。

## 全体の流れ

1. 必要な情報をユーザーから集める
2. 開催日が過ぎている既存の「開催予定」カードを「過去開催」セクションへ移動する
3. 新規セミナーが未来日か過去日かで分岐する
   - 未来日 → 詳細ページ・申込ページ・OGP画像一式をテンプレートから生成し、一覧の「開催予定」に追加
   - 過去日（実績としての事後登録） → 詳細/申込ページは作らず、「過去開催」に直接カードを追加
4. 最終チェック（リンク切れ・コピペ跡・相対パスの確認）
5. SEOの仕上げ（未来日のケースのみ。`seo-optimizer` Agentを呼んで新規ページのmeta/OGP/構造化データを仕上げる）

順番に説明する。

## ステップ0: 情報収集

いきなり書き始めず、以下が揃っているか確認する。ユーザーが最初のメッセージで既に書いてくれている項目は聞き直さない。曖昧・未確定な項目は「仮でこうします」と明示して進めてよいものと、ユーザーの決定が必須なものを区別すること。

**ほぼ確実にユーザー判断が必要なもの:**
- セミナー名・キャッチコピー（詳細ページ `<h1>` に使う短い訴求フレーズ）
- 開催日・時間・会場（オンライン/オフライン、住所）
- 参加費・定員
- ターゲット層、当日得られること、プログラム（タイムライン）の概要
- 講師（bitcraftの安藤太亮が主催する前提が多いが、共同講師がいれば紹介文が必要）
- フォルダ名にする英語 slug（例: `ai-writing-1day`）。ユーザーが指定しなければ内容から適切な kebab-case を提案し、確認を挟まず先に進めてよい（後から `mv` すれば直せるため致命的ではない）

**このSkill単体では埋められないもの（[[references/google-form-fields.md]] 参照）:**
- 申込みフォームの送信先（Googleフォームのentry ID）。Googleフォームそのものを作るのは別のSkillの領域なので、ここでは「フォームがまだ無い」という回答も正解として扱い、プレースホルダーで進める。

情報が全部揃うまで待つ必要はない。埋まっていない部分はプレースホルダー文言（「詳細は近日公開」等）で仮置きし、対応するHTMLコメントで `<!-- TODO: -->` と明示しておけば、ユーザーは差分を見てすぐ気づける。

## ステップ1: 今日の日付を確認する

```bash
date +%F
```

会話の中で「今日の日付」が示されていても、実行環境のタイムゾーンとズレることがあるため、判断の基準にするのは常にこのコマンドの出力にする。

## ステップ2: 開催日が過ぎた「開催予定」セミナーを「過去開催」へ移動する

`service/seminar/index.html` の `<!-- Seminar List -->` セクション（`.seminar-list-section` で `--past` が付いていない方）にある各 `<li class="seminar-card">` を見て、日付を判定する。日付はカード内の `.seminar-card-date` のテキストだけでなく、リンク先の詳細ページの `<meta name="event-date" content="YYYY-MM-DD">` の方が機械可読で確実なので、そちらを正とする。

開催日 < 今日 のカードが見つかったら、以下を行う（新しいセミナーを追加するかどうかに関わらず、気づいたらこの移動は毎回やる。サイトの整合性を保つための副次的な仕事であって、メインの追加作業をブロックするものではない）:

1. `<li>` ごと「過去に開催したセミナー」の `<ul class="seminar-card-list">` の**先頭**（開催日が新しい順に並んでいるため）に移す
2. `<li class="seminar-card">` → `<li class="seminar-card seminar-card--past">` にクラスを追加
3. `<div class="seminar-card-badge">受付中</div>` → `<div class="seminar-card-badge seminar-card-badge--past">終了</div>`
4. `<span class="seminar-seats-left">残りN名</span>` は削除する（募集は終わっているので残席表示に意味がない。「定員 20名」のような定員表示自体は残す）
5. 画像は詳細ページが既にあるので `./img/past-seminar-*.png` を新規生成する必要はなく、`src="./<slug>/img/sns-image.png"` のように詳細ページ側の画像をそのまま参照する（3つの初期past事例は詳細ページが存在しないため専用画像を生成しているが、これは例外的な過去データであり今後の標準ではない）
6. `<a class="seminar-card-link">` の `href` はそのまま残してよい（`deadline.js` が開催日翌日以降は詳細ページ側のCTAを自動でロックするため、リンクを残しても実害はなく、むしろ詳細ページの内容自体は資産として見られる価値がある）

## ステップ3: 新規セミナーが未来日か過去日かで分岐

### 3-A. 未来日の場合（通常はこちら）

#### 3-A-1. フォルダをテンプレートから複製する

```bash
cp -r service/seminar/claude-code-1day service/seminar/<slug>
```

このコマンドで `index.html`（詳細ページ）、`seminar-detail-style.css`、`deadline.js`、`apply/`（`index.html`・`apply-script.js`・`apply-style.css`）、`img/`（過去の講師写真とOGP設定ファイルを含む）が一式コピーされる。

- `seminar-detail-style.css` と `apply-style.css` と `deadline.js` は中身がセミナー固有の文言に依存しないので、**基本的にそのまま流用でき、書き換え不要**。クラス名は `sd-`（詳細ページ）・`seminar-card`（一覧）・`form-control`（申込フォーム）というプレフィックスで統一されており、新しい見た目が必要な場合だけCSSに手を加える。
- `img/` の中の `speaker_ando.jpg` や `speaker_matsuishi.png` は、同じ講師が再登壇するなら消さずに使い回す。別の講師なら差し替える（写真が無ければ `sd-speaker-card__photo-placeholder` のアイコン表示にフォールバックする作りなので、写真無しでも壊れない）。
- `img/ogp-config.json` はOGP画像生成用の設定ファイル（コピー元 `claude-code-1day` の内容が入ったまま）で、ステップ3-A-4で新セミナーの内容に書き換えてから使う。生成スクリプト自体は `.claude/skills/add-seminar/scripts/generate_ogp.py` に一本化されており、各セミナーフォルダには複製されない（後述）。

#### 3-A-2. 詳細ページ（`<slug>/index.html`）を書き換える

コピーした内容は「Claude Code 完全攻略1Dayセミナー」用の文章がそのまま入っているので、全セクションを新しいセミナーの内容に書き換える。抜け漏れを防ぐため、上から順に潰していく:

- `<head>`: `description`・`keywords`・`og:title`・`og:description`・`og:url`・`og:image`・`event-date`（この meta タグを `deadline.js` が読むので必須）・`<title>`
- `<link rel="stylesheet" href="seminar-detail-style.css">` 以降のパス階層はテンプレートのままで変わらない（`service/seminar/<slug>/` は元の `claude-code-1day/` と同じ深さなので `../../../` などの相対パスは修正不要）
- HERO: パンくずの見出し・バッジの日付・キャッチコピー・サブコピー・CTAのラベル・料金/定員
- TARGET: 「こんな方に届けたい」の箇条書き（3〜4項目）
- BENEFITS: 「セミナーで得られること」のカード（4枚が目安。数を増減させても崩れない）
- TIMELINE: 当日のタイムスケジュール。休憩を挟む構成は `sd-timeline__item--break`、最後は `sd-timeline__item--end` のクラスを付ける
- VOICES: まだ開催前で実績が無いのが通常なので、[[references/section-guidance.md]] に沿ってプレースホルダー文言（「※ 開催後に実績として掲載予定」）にする。過去に類似セミナーの感想があれば転用してよい
- SPEAKERS: 講師紹介。写真が無い場合は `<img>` タグごと削除せず残してよい（`onerror` でプレースホルダーアイコンに自動フォールバックする）
- OVERVIEW: 日時・会場（Googleマップの `iframe src` の `q=` パラメータも会場名に更新する）・定員・参加費・持ち物・講師
- FAQ: セミナー内容に即した質問に総入れ替えする。「Claude Code」固有のFAQ（Proプランの課金体系など）は今回のテーマに関係なければ削除し、テーマに合った質問に差し替える
- CTA: 見出し・開催概要の再掲・申込みボタン

#### 3-A-3. 申込ページ（`<slug>/apply/index.html` と `apply-script.js`）を書き換える

`<head>` の `description`・`event-date`・`<title>`、本文の見出し・締切メッセージの日付を更新する。

申込完了後にGAS(Google Apps Script)経由で自動返信メールを送りたい場合は、このSkillの範囲外なので `add-form` Skillに従う（entry ID対応とGAS自動返信は疎結合な別の仕組みなので、このステップではGoogleフォーム未接続のプレースホルダーのまま進めてよい）。

フォーム項目については [[references/google-form-fields.md]] を読み、ユーザーに送信先（GoogleフォームのURLと各質問の `entry.xxxxx` ID）を確認する。まだフォームが無い場合は、そのファイルに書いてある案内どおりプレースホルダーのまま進めてよい（ただし `apply-script.js` の `GOOGLE_FORM_URL` にはっきり分かるダミー値を入れ、ユーザーへの最終報告で「フォーム未接続」であることを明言する）。

#### 3-A-4. OGP画像（`sns-image.png`）を生成する

`<slug>/img/ogp-config.json` はテンプレートからコピーされてきたものなので、中の `text`（タイトル・日付・会場・講師名など）と `color`（アクセントカラー。既存3色 `#0f2442`紺・`#1a0b2e`紫・`#0a2e15`緑・`#111111`黒 と被らない新しい色を選ぶ）を新セミナーの内容に書き換えてから、共有スクリプトを実行する:

```bash
python3 .claude/skills/add-seminar/scripts/generate_ogp.py --config service/seminar/<slug>/img/ogp-config.json
```

生成スクリプトは各セミナーフォルダに複製せず `.claude/skills/add-seminar/scripts/generate_ogp.py` に1本化されている（以前は `img/` 配下にスクリプト自体をコピーしてConfigを直接書き換える方式だったが、スクリプトがコピーのたびに複製されるうえ `.gitignore` 対象でリポジトリに残らなかったため、設定だけをJSONとして各セミナーに残す形に変えた）。`--outdir` を省略すると `--config` と同じディレクトリに `sns-image.png` を出力する。講師写真は初回のみ `ogp-config.json` の `media.SPEAKER_IMAGE_URL` からダウンロード＋背景除去されるが、同じ講師で既に別セミナーの切り抜き画像があるなら `--speaker-cutout <既存のspeaker_image_cutout.pngへのパス>` を渡して使い回せる（ダウンロード・背景除去をスキップできる）。

このスクリプトは **ヘッドレスChrome・Pillow・rembg（講師写真の背景除去）に依存する**。環境にこれらが無ければ失敗するので、失敗した場合は無理に直そうとせず次のいずれかで代替する:
- 同じ講師なら既存の `speaker_image_cutout.png` を `--speaker-cutout` で流用して見た目だけ差分適用する
- それも難しければ `sns-image.png` の生成だけユーザーに依頼し、他の作業は止めずに進める

画像生成の失敗はサイト全体を止めるほどのブロッカーではない（`<img>` タグが壊れるだけで、OGP以外のページ機能には影響しない）ので、深追いしすぎないこと。

### 3-B. 過去日の場合（事後的に実績として記録するだけのケース）

ユーザーが「先月やったセミナーを過去実績として載せたい」のように、既に終わったイベントの記録目的で依頼してきた場合は、3-Aのフル scaffold は不要。既存の3件の過去セミナー（`past-seminar-lp.png` 等）と同じ軽量パターンに合わせる:

1. `service/seminar/claude-code-1day/img/ogp-config.json` を参考に、新しい1件分の設定（タイトル・日付・会場・アクセントカラー）を持つ一時的なJSONファイルを作り（詳細ページ用フォルダは作らないので、スクラッチ領域に置いてよい）、共有スクリプトで `service/seminar/img/` に直接出力する:
   ```bash
   python3 .claude/skills/add-seminar/scripts/generate_ogp.py \
     --config <一時configのパス> \
     --outdir service/seminar/img \
     --out-name past-seminar-<slug>.png \
     --speaker-cutout service/seminar/claude-code-1day/img/speaker_image_cutout.png
   ```
   `--speaker-cutout` は同じ講師（通常は安藤太亮）の切り抜き画像を使い回すためのもので、既存セミナーのどれか（例: `claude-code-1day`）の `img/speaker_image_cutout.png` を指せばダウンロード・背景除去をスキップできる。講師が異なる場合は configの `media.SPEAKER_IMAGE_URL` を設定して `--speaker-cutout` を省略する。
2. `service/seminar/index.html` の「過去に開催したセミナー」の `<ul>` に、日付が新しい順になる位置へ `<li class="seminar-card seminar-card--past">` を追加する（既存の3件と同じ構造。`<a>` に `href` は付けない）

## ステップ4: 一覧ページに新規カードを追加する（3-Aのケース）

`service/seminar/index.html` の「開催予定のセミナー」`<ul class="seminar-card-list">` に、`href="./<slug>/"` を持つ新しい `<li class="seminar-card">` を追加する。既存の型をそのままなぞる:

- バッジは `受付中`
- 画像は `./<slug>/img/sns-image.png`
- 日付・タイプ・タイトル・説明・価格・定員は詳細ページと一致させる
- `残りN名` の初期値は、ユーザーから開始時点の申込数の指定が無ければ定員と同数（＝満席まで定員名）にする
- 複数の「開催予定」が並ぶ場合は、開催日が早い順に並べる

## ステップ5: 最終チェック

`scripts/check_seminar.sh <slug>` を実行し、以下を機械的に確認する:
- 詳細ページと申込ページの `event-date` meta が一致しているか
- コピー元の文言（「Claude Code」「claude-code-1day」等）の消し忘れが残っていないか
- 一覧ページ・詳細ページ・申込ページ間の相対リンクが実在するファイルを指しているか

スクリプトが指摘した項目は必ず目視でも確認する（自動チェックはコピペ跡や壊れたリンクなど機械的に分かるものしか見つけられず、文章の質やレイアウト崩れは見ていない）。

最後に、可能であればブラウザ相当の確認（少なくとも各HTMLファイルを開いてリンク遷移を目でたどる）をして、ユーザーに「詳細ページ」「申込ページ」「一覧ページの見え方」を要約して報告する。

## ステップ6: SEOの仕上げ（`seo-optimizer` Agentを呼ぶ）

3-Aのケース（詳細ページ・申込ページを新規生成した場合）に限り、Agentツール（`subagent_type: seo-optimizer`）で `.claude/agents/seo-optimizer.md` のSEO専門サブエージェントを呼び出す。プロンプトには対象ファイルを明示すること（例:「`service/seminar/<slug>/index.html` と `service/seminar/<slug>/apply/index.html` の2ページを対象にSEO監査と実装をお願いします」）。指定しないとサイト全体が監査対象になり、無関係な既存ページまで書き換えられてしまう。

seo-optimizerはmeta descriptionの固有化・`og:url`/`og:image`の絶対URL統一・Event/FAQPage構造化データ（JSON-LD）の追加・画像altの具体化などをその場で実装するが、git commit/push・PR作成は行わない（このSkill自身と同じ制約）。実装内容はユーザーへの最終報告に含める。

3-Bのケース（過去実績としてカードのみ追加）は詳細ページが存在しないため、この呼び出しはスキップしてよい。

このリポジトリで変更をコミット・PR化する流れは `create-pr` Skill が別途あるので、ユーザーがそれを望んだらそちらに任せる（このSkillの範囲はファイルの作成・編集まで）。
