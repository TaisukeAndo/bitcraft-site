variable "account_id" {
  description = "Cloudflareアカウント ID"
  type        = string
}

variable "zone_name" {
  description = "対象ゾーン名（bitcraft.work は既にCloudflareゾーンとして存在するため、Terraformでは新規作成せずdata sourceで参照する）"
  type        = string
  default     = "bitcraft.work"
}

variable "enable_custom_domains" {
  description = <<-EOT
    Workers Custom Domain (bitcraft.work / api.bitcraft.work / mcp.bitcraft.work)
    を有効化するか。

    false のままだと、このTerraform構成はD1/R2/KVといった「新規かつ本番トラフィックに
    影響しないリソース」のみを作成する。true にすると、bitcraft.work の実際のDNS
    ルーティングがGitHub Pagesから apps/web Worker へ切り替わる（apps/api / apps/mcp の
    サブドメインも同様に有効化される）。

    実装計画のPhase 8（DNS切替・カットオーバー）でのみ true にすること。
  EOT
  type        = bool
  default     = false
}
