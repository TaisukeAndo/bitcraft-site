import { APPLICATION_EMAIL_SENDER_DOMAIN, type ApplicationEmailTemplate } from "./email-template";

// お問い合わせフォーム(contacts)の自動返信メール・運用者への通知メールの
// デフォルト文面。「メールの内容自体もAPIで設定管理できるようにしたい」という
// ユーザー要望への対応（seminarsのDEFAULT_APPLICATION_EMAIL_TEMPLATEと同じ
// 位置づけ・型(ApplicationEmailTemplate)を再利用する）。
export type ContactEmailContext = {
  name: string;
  email: string;
  affiliation: string;
  inquiryType: string;
  message: string;
};

// ContactEmailContextのキー一覧。ツール説明文(apps/mcp)・保存時の未知トークン
// 検出(findUnknownPlaceholders、email-template.ts)の単一の情報源にする
// （seminars側のSEMINAR_EMAIL_TOKENSと同じ理由）。
export const CONTACT_EMAIL_TOKENS: (keyof ContactEmailContext)[] = [
  "name",
  "email",
  "affiliation",
  "inquiryType",
  "message",
];

export const DEFAULT_CONTACT_NOTIFICATION_TEMPLATE: ApplicationEmailTemplate = {
  fromName: "bitcraft",
  fromEmail: `contact@${APPLICATION_EMAIL_SENDER_DOMAIN}`,
  subject: "【bitcraft】お問い合わせ: {{inquiryType}}",
  bodyText: `お名前: {{name}}
メールアドレス: {{email}}
ご所属: {{affiliation}}
お問い合わせ種別: {{inquiryType}}

ご相談内容:
{{message}}`,
};

export const DEFAULT_CONTACT_CONFIRMATION_TEMPLATE: ApplicationEmailTemplate = {
  fromName: "bitcraft",
  fromEmail: `contact@${APPLICATION_EMAIL_SENDER_DOMAIN}`,
  subject: "【bitcraft】お問い合わせありがとうございます",
  bodyText: `{{name}} 様

この度はお問い合わせいただき、誠にありがとうございます。
以下の内容で受け付けいたしました。担当者より追ってご連絡いたしますので、今しばらくお待ちください。

お問い合わせ種別: {{inquiryType}}

ご相談内容:
{{message}}

--
bitcraft
https://bitcraft.work/`,
};
