# Workers Custom Domain。var.enable_custom_domains が false の間は何も作成しない
# （= 本番の bitcraft.work ルーティングには一切影響しない）。
# Phase 8のカットオーバー時に `-var enable_custom_domains=true` で初めて有効化する。
#
# 対応するWorkerスクリプト本体（bitcraft-web / bitcraft-api / bitcraft-mcp）は
# Terraformではなく `wrangler deploy` でデプロイする（Phase 4/5/6）。Custom Domain
# 有効化の前提として、これらのWorkerが先にデプロイ済みである必要がある。
resource "cloudflare_workers_custom_domain" "web" {
  count      = var.enable_custom_domains ? 1 : 0
  account_id = var.account_id
  hostname   = var.zone_name
  service    = "bitcraft-web"
  zone_id    = local.zone_id
}

resource "cloudflare_workers_custom_domain" "api" {
  count      = var.enable_custom_domains ? 1 : 0
  account_id = var.account_id
  hostname   = "api.${var.zone_name}"
  service    = "bitcraft-api"
  zone_id    = local.zone_id
}

resource "cloudflare_workers_custom_domain" "mcp" {
  count      = var.enable_custom_domains ? 1 : 0
  account_id = var.account_id
  hostname   = "mcp.${var.zone_name}"
  service    = "bitcraft-mcp"
  zone_id    = local.zone_id
}
