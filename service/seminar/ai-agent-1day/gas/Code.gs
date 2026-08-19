/**
 * Claude Code AIエージェント構築1Dayセミナー 申込み自動返信
 *
 * セットアップ手順は .claude/skills/add-form/references/gas-setup.md を参照。
 * 要約:
 *   1. Googleフォームの質問タイトルは、apply/index.html の入力ラベルと一字一句一致させる
 *      （このスクリプトが依存するのは「メールアドレス」「お名前」の2つ）
 *   2. フォームの回答用スプレッドシートを作成し、その「拡張機能」→「Apps Script」に
 *      このファイルの中身を貼り付けて保存
 *   3. トリガーを追加: 関数=onFormSubmit / イベント元=スプレッドシートから / 種類=フォーム送信時
 *   4. 実際にGoogleフォームができたら、apply-script.js の GOOGLE_FORM_URL と
 *      各 name 属性（entry.xxxxxxxxx）も実際の値に差し替えること（このファイルとは無関係の作業）
 *
 * 未確定事項:
 *   - 振込期限の具体的な日数はユーザー未指定のため、本文では「開催日までに」とだけ案内している。
 *     期限を明確にしたい場合は CONFIG や buildBody() 内の該当箇所を書き換える。
 */

const CONFIG = {
  EMAIL_FIELD: "メールアドレス",
  NAME_FIELD: "お名前",
  DEFAULT_NAME: "お客様",
  SUBJECT: "【bitcraft】Claude Code AIエージェント構築1Dayセミナー お申し込みありがとうございます",
  CC: "shuzo.yoshii@gmail.com",
  SENDER_NAME: "bitcraft",
};

function onFormSubmit(e) {
  const namedValues = e.namedValues; // { "質問タイトル": ["回答"], ... }

  const email = getAnswer(namedValues, CONFIG.EMAIL_FIELD);
  if (!email) {
    console.error(
      "宛先メールアドレスを取得できませんでした。質問タイトル『" +
        CONFIG.EMAIL_FIELD +
        "』がGoogleフォームの実際の質問文と一致しているか確認してください。namedValues=" +
        JSON.stringify(namedValues)
    );
    return;
  }

  const name = getAnswer(namedValues, CONFIG.NAME_FIELD) || CONFIG.DEFAULT_NAME;
  const body = buildBody(name);

  MailApp.sendEmail(email, CONFIG.SUBJECT, body, {
    name: CONFIG.SENDER_NAME,
    cc: CONFIG.CC,
  });
}

function getAnswer(namedValues, title) {
  const v = namedValues[title];
  return v && v[0] ? String(v[0]).trim() : "";
}

function buildBody(name) {
  return [
    name + " 様",
    "",
    "この度は「Claude Code AIエージェント構築1Dayセミナー」にお申し込みいただき、誠にありがとうございます。",
    "以下の内容でお申し込みを受け付けいたしました。",
    "",
    "────────────────────",
    "■ セミナー概要",
    "────────────────────",
    "日時：2026年9月19日（土） 10:00〜17:00",
    "会場：SANDBOX TOTTORI（鳥取県鳥取市浜坂1390-224）",
    "参加費：5,500円（税込）",
    "",
    "────────────────────",
    "■ 参加費のお振込みについて",
    "────────────────────",
    "下記いずれかの口座へ、開催日までに参加費のお振込みをお願いいたします。",
    "",
    "【口座1】",
    "鳥取銀行　本店営業部",
    "普通　0401255",
    "ヨシイ シュウゾウ",
    "",
    "【口座2】",
    "三井住友銀行　渋谷駅前支店",
    "普通　3119524",
    "ヨシイ シュウゾウ",
    "",
    "お振込みが完了しましたら、お手数ですが本メールへの返信にてご一報ください。",
    "",
    "※ 法人でのお申し込みなど、事前のお振込みが難しい場合は、",
    "　本メールにご返信いただくか、下記お問い合わせ先までご相談ください。",
    "",
    "────────────────────",
    "■ 会場・駐車場について",
    "────────────────────",
    "SANDBOX TOTTORI様のご厚意で特別に会場をご提供いただいております。",
    "恐れ入りますが、施設内カフェでの1ドリンクのご注文にご協力をお願いいたします。",
    "",
    "駐車場は、徒歩約1分の「県営砂丘駐車場」（普通車60台）をご利用ください。",
    "",
    "────────────────────",
    "■ お問い合わせ",
    "────────────────────",
    "本メールに直接ご返信いただくか、以下よりお問い合わせください。",
    "https://bitcraft.work/contact/",
    "",
    "当日皆さまにお会いできることを楽しみにしております。",
    "",
    "bitcraft",
    "安藤 太亮 / 吉井 秀三",
  ].join("\n");
}
