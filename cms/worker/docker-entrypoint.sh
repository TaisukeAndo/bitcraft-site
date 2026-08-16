#!/bin/sh
# `docker compose up worker` から呼ばれるエントリポイント。
# - .dev.vars が無ければ、環境変数（cms/.env経由、無ければデフォルト値）から生成する
#   （wrangler devはローカル実行時にこのファイルからsecret相当の値を読む）
# - node_modules は名前付きvolumeなので、ソースをbind mountし直しても消えない
# - wrangler dev は現行バージョンでD1/KV/R2等のbindingをデフォルトでローカルのみで
#   エミュレートする（Cloudflareアカウントへの通信なしで動く）
set -eu

if [ ! -f .dev.vars ]; then
  cat > .dev.vars <<EOF
MCP_BEARER_TOKEN=${MCP_BEARER_TOKEN:-local-dev-token}
GITHUB_TOKEN=${GITHUB_TOKEN:-}
GITHUB_REPO=${GITHUB_REPO:-}
EOF
  echo "[docker-entrypoint] .dev.vars が無かったので生成しました（cms/worker/.dev.vars、以後は直接編集してよい）"
fi

echo "[docker-entrypoint] npm install..."
npm install

echo "[docker-entrypoint] starting wrangler dev on 0.0.0.0:8787"
exec npx wrangler dev --ip 0.0.0.0 --port 8787
