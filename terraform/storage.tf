# D1: CMSデータ本体（news/seminars/media/api_keys、Phase 2でスキーマ投入）
resource "cloudflare_d1_database" "cms" {
  account_id            = var.account_id
  name                  = "bitcraft-cms"
  primary_location_hint = "apac"
}

# R2: セミナー/News用メディア（講師写真・OGP画像等）
resource "cloudflare_r2_bucket" "media" {
  account_id = var.account_id
  name       = "bitcraft-media"
  location   = "apac"
}

# 注意: Terraform state用の bitcraft-tfstate バケットは、鶏卵問題を避けるため
# `wrangler r2 bucket create bitcraft-tfstate` でTerraform外に作成し、
# ここでは意図的に管理しない（terraform/README.md 参照）。
