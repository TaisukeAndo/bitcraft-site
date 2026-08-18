# このフォルダについて

`Code.gs` は、このセミナーの申込フォーム送信時に申込者へ自動返信メールを送るGoogle Apps Scriptのソースです。**このリポジトリに置いてあるだけでは動きません**。Googleスプレッドシート側のApps Scriptエディタに手動で貼り付けて設定する必要があります（Claude Codeはブラウザ操作・Googleログインができないため代行できません）。

## 現在の状態（Googleフォーム作成・接続済み／GAS未設置）

- Googleフォームは作成済み（<https://docs.google.com/forms/d/e/1FAIpQLScDbru2yfQwWov5n5heSOexj0-xeDSZMldRmxB8Dw7Mh9poHw/viewform>）
- `apply/apply-script.js` の `GOOGLE_FORM_URL` と `apply/index.html` 内の各 `name="entry.xxxxxxxxx"` は、実際に作成されたフォームの値に差し替え済み
- 回答用スプレッドシート・`Code.gs` の設置・トリガー設定はまだ（以下の手順2〜7が残作業）

## やること

1. ~~`gas/google-form-spec.md` を見ながらGoogleフォームを新規作成する~~ → 完了
2. フォームの「回答」タブから回答用スプレッドシートを作成する
3. スプレッドシートの「拡張機能」→「Apps Script」を開き、`Code.gs` の中身を貼り付けて保存する
4. トリガーを追加: 実行する関数 `onFormSubmit` / イベントのソース `スプレッドシートから` / イベントの種類 `フォーム送信時`
5. 初回保存時の権限承認を許可する
6. ~~`apply/apply-script.js` の `GOOGLE_FORM_URL` と、`apply/index.html` 内の各 `name="entry.xxxxxxxxx"` を、実際に作成したGoogleフォームの値に差し替える~~ → 完了
7. テスト送信して、スプレッドシートに回答が入ること・自動返信メールが届くことの両方を確認する

詳しい手順・トラブルシューティングは `.claude/skills/add-form/references/gas-setup.md` を参照してください。

## 振込先・金額を変更したい場合

`Code.gs` の `buildBody()` 内を直接編集してください。振込期限は現時点で具体的な日数の指定が無かったため「開催日までに」とだけ記載しています。
