// セミナー申込の確認メール。「メールの内容自体もAPIでセミナーごとに
// 設定管理できるようにしたい」というユーザー要望への対応。
// fromEmailは常に `*@bitcraft.work`（ドメイン自体はzodスキーマ上どのアドレスも
// 許可するが、実際の送信はGmail SMTPリレー(apps/api/src/lib/smtp-mailer.ts)
// 経由で、Gmail側の「送信元アドレス」として検証済みのcontact@bitcraft.workの
// みが送信可能。他のアドレスを指定した場合は送信時にfailedとして記録される）
// である必要がある。
export type ApplicationEmailTemplate = {
  fromName: string;
  fromEmail: string;
  subject: string; // {{token}}プレースホルダーを含められる
  bodyText: string; // {{token}}プレースホルダーを含められる
  bodyHtml?: string; // 任意。指定しない場合はbodyTextのみのプレーンテキストメールになる
  cc?: string[]; // 任意。To以外に常に写しを送りたい宛先
  bcc?: string[]; // 任意。To/Ccに見せずに写しを送りたい宛先
};

export const APPLICATION_EMAIL_SENDER_DOMAIN = "bitcraft.work";

export const DEFAULT_APPLICATION_EMAIL_TEMPLATE: ApplicationEmailTemplate = {
  fromName: "bitcraft",
  fromEmail: `contact@${APPLICATION_EMAIL_SENDER_DOMAIN}`,
  subject: "【{{seminarTitle}}】お申し込みありがとうございます",
  bodyText: `{{applicantName}} 様

この度は「{{seminarTitle}}」にお申し込みいただき、誠にありがとうございます。
以下の内容で受け付けいたしました。

開催日: {{eventDateDisplay}}
会場: {{venueSummary}}
参加費: {{priceDisplay}}

担当者より追って詳細のご案内をお送りしますので、今しばらくお待ちください。

--
bitcraft
https://bitcraft.work/`,
};

export type EmailTemplateContext = {
  applicantName: string;
  seminarTitle: string;
  eventDateDisplay: string;
  venueSummary: string;
  priceDisplay: string;
};

// EmailTemplateContextのキー一覧。ツール説明文(apps/mcp)・保存時の未知トークン
// 検出(findUnknownPlaceholders)の両方がこの一覧を単一の情報源として参照する
// （{{name}}（誤、contact用のトークン）と{{applicantName}}（正）を取り違えて
// 保存され、レンダリング時に黙って空文字になり実際の送信で名前が抜け落ちる、
// という実際に起きた事故の再発防止）。
export const SEMINAR_EMAIL_TOKENS: (keyof EmailTemplateContext)[] = [
  "applicantName",
  "seminarTitle",
  "eventDateDisplay",
  "venueSummary",
  "priceDisplay",
];

// {{applicantName}} のようなプレースホルダーを実際の値に置換する。
// 未知のトークン・値が無いトークンは空文字に置換する（テンプレート側の
// タイプミスでメール送信自体が失敗しないようにするため）。
// コンテキストの形はseminars(EmailTemplateContext)・contact
// (ContactEmailContext、contact-email-template.ts)で異なるため、
// Record<string, string | undefined>を受け取る汎用実装にしてある
// （両者で共通利用するコンポーネント）。
export function renderEmailTemplate(template: string, context: Record<string, string | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return context[key] ?? "";
  });
}

// subject/bodyText/bodyHtmlに含まれる{{token}}のうち、knownTokensに無いものを
// 検出する。renderEmailTemplateは未知のトークンを空文字へ黙って置換する設計の
// ため、保存時にこれで検出して呼び出し元に警告を返す（seminars/contact双方の
// テンプレート保存エンドポイントで共有するコンポーネント）。
export function findUnknownPlaceholders(text: string, knownTokens: readonly string[]): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\{\{(\w+)\}\}/g)) {
    const token = match[1];
    if (token && !knownTokens.includes(token)) found.add(token);
  }
  return [...found];
}
