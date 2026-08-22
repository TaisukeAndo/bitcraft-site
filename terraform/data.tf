# bitcraft.work は既にCloudflareゾーンとして存在する（ネームサーバーが
# albert.ns.cloudflare.com / elma.ns.cloudflare.com であることを確認済み。
# Cloudflare Email Routing による MXレコード・SPF/Google認証用TXTレコードが
# 既に稼働しているため、ゾーン自体をTerraformで作成・削除の対象にはしない）。
#
# ゾーンIDの参照は data source のみで行い、cloudflare_zone リソースとしての
# import・管理はしない（誤ってゾーン自体を destroy/recreate してしまうリスクを避けるため）。
data "cloudflare_zones" "bitcraft" {
  name = var.zone_name
}

locals {
  zone_id = data.cloudflare_zones.bitcraft.result[0].id
}
