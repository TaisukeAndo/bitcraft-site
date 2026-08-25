export type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  // Gmail SMTPリレー(smtp-mailer.ts)の認証用アプリパスワード。Cloudflare
  // Email Sendingの検証済み宛先制限（有料オンボーディングが必要）を回避するため、
  // 無料のGmail SMTPに切り替えた。Wrangler secretとして設定する
  // （wrangler secret put GMAIL_APP_PASSWORD）。
  GMAIL_APP_PASSWORD: string;
};
