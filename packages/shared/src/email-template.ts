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

// {{applicantName}} のようなプレースホルダーを実際の値に置換する。
// 未知のトークン・値が無いトークンは空文字に置換する（テンプレート側の
// タイプミスでメール送信自体が失敗しないようにするため）。
export function renderEmailTemplate(template: string, context: EmailTemplateContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = (context as Record<string, string | undefined>)[key];
    return value ?? "";
  });
}
