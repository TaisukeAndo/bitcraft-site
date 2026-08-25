import { WorkerMailer } from "worker-mailer";
import type { Bindings } from "./bindings";

// Gmail SMTPリレー経由でメールを送信する。
//
// 経緯: Cloudflare Email Sendingはアカウント側の制限で「検証済み宛先アドレス」
// にしか送信できず、任意の宛先（お問い合わせ者・セミナー申込者など第三者）へ
// 送るには送信ドメインの本番オンボーディング（有料プラン）が必要だった。
// 無料で運用するため、Gmailの無料SMTPリレーに切り替えた
// （Cloudflare Workersが2026年1月に対応したcloudflare:socketsによるTCP接続を
// 利用するworker-mailerライブラリ経由。compatibility_flags:["nodejs_compat"]
// が必要）。
//
// 認証はGmailアカウント本体(GMAIL_USER)で行うが、Fromヘッダーには
// contact@bitcraft.workを指定できる。これはGmail側の「送信元アドレスを追加」
// 機能で検証済みのエイリアスとして設定されているため（ユーザー確認済み）。
// 他の*@bitcraft.workアドレス（emailContentSchemaのzodバリデーション上は許可
// されている）をFromに指定した場合、Gmail側が拒否しsendMailは失敗する
// （呼び出し元は結果をstatus:"failed"として記録する設計になっている）。
const GMAIL_SMTP_HOST = "smtp.gmail.com";
const GMAIL_SMTP_PORT = 587; // STARTTLS。465(暗黙TLS)ではない
const GMAIL_USER = "ando1202taisuke@gmail.com";

export type SendEmailInput = {
  to: string;
  from: { email: string; name: string };
  subject: string;
  text: string;
  html?: string;
  cc?: string[] | null;
  bcc?: string[] | null;
};

export async function sendMail(env: Bindings, input: SendEmailInput): Promise<void> {
  await WorkerMailer.send(
    {
      host: GMAIL_SMTP_HOST,
      port: GMAIL_SMTP_PORT,
      secure: false,
      startTls: true,
      credentials: { username: GMAIL_USER, password: env.GMAIL_APP_PASSWORD },
      authType: "plain",
    },
    {
      from: input.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      cc: input.cc?.length ? input.cc : undefined,
      bcc: input.bcc?.length ? input.bcc : undefined,
    },
  );
}
