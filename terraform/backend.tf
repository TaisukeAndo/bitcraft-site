# Terraform state backend: R2をS3互換バックエンドとして利用する
# (Cloudflare公式ドキュメント推奨方式:
#  https://developers.cloudflare.com/terraform/advanced-topics/remote-backend/)
#
# 前提（Phase 1のブートストラップ手順として、このバックエンド自体はTerraform管理外で
# 一度だけ手動作成する。state を保存する場所を state 自体で管理する鶏卵問題の回避）:
#   wrangler r2 bucket create bitcraft-tfstate
#
# 認証情報は R2 専用の S3互換 API トークン（Access Key ID / Secret Access Key）を
# 環境変数 AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY として渡す
# （Cloudflareダッシュボード > R2 > "Manage R2 API Tokens" で、
#   bitcraft-tfstate バケットのみに限定した権限で発行する。
#   アカウント全体のCloudflare APIトークンとは別物）。
#
# ロック機構: R2にはDynamoDB相当のネイティブロックが無い。Terraform 1.10+の
# use_lockfile（条件付き書き込みベースのロック）がR2で機能するかは実装時に要検証。
# 単一運用者プロジェクトのため同時apply競合リスクは低いが、CIからのapplyは直列実行に
# 固定すること（.github/workflows/deploy.yml、Phase 7）で実質的にリスクを抑える。
terraform {
  backend "s3" {
    bucket = "bitcraft-tfstate"
    key    = "production/terraform.tfstate"
    region = "auto"

    endpoints = {
      s3 = "https://59a8b4226712e138bd4101ca59aaef41.r2.cloudflarestorage.com"
    }

    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}
