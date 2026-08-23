export type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  EMAIL: SendEmail; // セミナー申込の確認メール送信用（bitcraft.work はEmail Sendingで認証済み）
};
