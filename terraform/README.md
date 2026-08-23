# terraform/

Cloudflareインフラ（D1・R2・KV・Workers Custom Domain）のTerraform構成。

管理方針の詳細は実装計画の7章を参照。要点だけ書くと:

- **Worker本体のコードデプロイはここでは行わない**（`wrangler deploy`が担当。Phase 4〜7）。
- **`bitcraft.work` ゾーン自体は作成・破棄の対象にしない**（既に存在し、Email Routing等が
  稼働中のため）。`data "cloudflare_zones"` で参照するのみ。
- **`var.enable_custom_domains = false`（既定値）の間、このTerraform構成は本番トラフィックに
  一切影響しない**。D1/R2/KVという「新規かつ無害なリソース」の作成のみを行う。
  `bitcraft.work` の実際のルーティングをGitHub PagesからWorkerへ切り替えるのは、
  Phase 8のカットオーバー時に `enable_custom_domains = true` にした時のみ。

## 初回セットアップ（ブートストラップ）

### 1. Terraform state用のR2バケットを作成する（Terraform外・一度だけ）

state を保存する場所を state 自体で管理できない鶏卵問題を避けるため、`wrangler` で先に作る。

```bash
CLOUDFLARE_API_TOKEN=<下記の手順2で発行したトークン> \
  npx wrangler r2 bucket create bitcraft-tfstate
```

### 2. Cloudflare APIトークンを発行する（wrangler・Terraformのcloudflareプロバイダ共通）

https://dash.cloudflare.com/profile/api-tokens → 「トークンを作成」→ カスタムトークン。

必要な権限（不足があれば `terraform plan`/`apply` のエラーを見て追加する）:

| 種別 | 対象 | 権限 |
|---|---|---|
| アカウント | D1 | 編集 |
| アカウント | Workers R2 Storage | 編集 |
| アカウント | Workers KV Storage | 編集 |
| アカウント | Workers スクリプト | 編集（Phase 4以降、`wrangler deploy`用） |
| ゾーン | ゾーン | 読み取り（`data "cloudflare_zones"` の参照用） |
| ゾーン | Workers ルート | 編集（Phase 8、Custom Domain用） |

- アカウントリソース: このアカウントのみ（`59a8b4226712e138bd4101ca59aaef41`）
- ゾーンリソース: 特定のゾーンのみ → `bitcraft.work`

発行したトークンは、リポジトリ直下に作る `.env.local`（gitignore対象）に保存する運用にする:

```
CLOUDFLARE_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Terraform state backend用のR2 S3互換認証情報を発行する

上記2のCloudflare APIトークンとは**別物**。R2はS3互換APIのため、AWS Signature V4形式の
Access Key ID / Secret Access Key が別途必要。

Cloudflareダッシュボード → R2 → 「R2 APIトークンを管理」→ `bitcraft-tfstate` バケットのみに
限定した「オブジェクトの読み取りと書き込み」権限で発行し、`.env.local` に追記する:

```
AWS_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. tfvarsを用意する

```bash
cp terraform.tfvars.example terraform.tfvars
# account_id = "59a8b4226712e138bd4101ca59aaef41" を設定
```

### 5. init → plan → apply

```bash
set -a && source ../.env.local && set +a
terraform init
terraform plan
terraform apply
```

## 通常運用

- 新しいリソースの追加・変更は必ず `terraform plan` の内容を確認してから `apply` する。
- `enable_custom_domains` を切り替えるのはPhase 8のカットオーバー作業時のみ。それ以外で
  誤って `true` にすると本番の `bitcraft.work` ルーティングが未完成のWorkerへ切り替わるため
  注意する。

## CI/CD（GitHub Actions、実装計画7章）

`terraform/**` を変更するPRでは `.github/workflows/terraform-plan.yml` が自動的に
`terraform plan` を実行し、結果をPRコメントとして投稿する（applyはしない）。
`main` への push（PRのsquash merge）では `.github/workflows/deploy.yml` が
`terraform/**` に変更があった場合のみ `terraform apply -auto-approve` を実行する
（無ければこのステップ自体skipされる）。

これらのワークフローが使うGitHubリポジトリシークレット（上記1〜3の認証情報と対応）:

| シークレット名 | 対応する値 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 手順2で発行したCloudflare APIトークン |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflareアカウント ID（`terraform.tfvars` の `account_id` と同じ値） |
| `TF_STATE_R2_ACCESS_KEY_ID` | 手順3で発行したR2 S3互換トークンのAccess Key ID |
| `TF_STATE_R2_SECRET_ACCESS_KEY` | 手順3で発行したR2 S3互換トークンのSecret Access Key |

いずれもTerraform state用の `bitcraft-tfstate` バケットや `enable_custom_domains`
の既定値（false）とは独立しており、CI側から `enable_custom_domains` を上書きする
ことは無い（Phase 8のカットオーバーは常に手動apply）。
