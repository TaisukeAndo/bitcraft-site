output "zone_id" {
  description = "bitcraft.work のゾーンID（apps/*/wrangler.jsonc の設定や後続フェーズで参照）"
  value       = local.zone_id
}

output "d1_database_id" {
  description = "D1データベース(bitcraft-cms)のID。apps/web・apps/apiのwrangler.jsonc(d1_databases.database_id)にPhase 2で設定する"
  value       = cloudflare_d1_database.cms.id
}

output "r2_media_bucket_name" {
  description = "R2バケット(bitcraft-media)名。apps/web・apps/apiのwrangler.jsonc(r2_buckets.bucket_name)で参照"
  value       = cloudflare_r2_bucket.media.name
}

output "kv_web_config_namespace_id" {
  description = "KVネームスペース(bitcraft-web-config)のID(任意機能用)"
  value       = cloudflare_workers_kv_namespace.web_config.id
}
