# メンテナンスモード等、apps/webの挙動をデプロイ無しで即時切り替えたい場合の
# 任意機能用KVネームスペース。Phase 4時点では未使用でも構わない。
resource "cloudflare_workers_kv_namespace" "web_config" {
  account_id = var.account_id
  title      = "bitcraft-web-config"
}
