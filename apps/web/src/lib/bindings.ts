export type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  API: Fetcher; // apps/api へのService Binding（セミナー申込のPOST委譲用）
};
