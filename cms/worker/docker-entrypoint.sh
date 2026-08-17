#!/bin/sh
# `docker compose up worker` から呼ばれるエントリポイント。
# - .dev.vars が無ければ、環境変数（cms/.env経由、無ければデフォルト値）から生成する
#   （wrangler devはローカル実行時にこのファイルからsecret相当の値を読む）
# - node_modules は名前付きvolumeなので、ソースをbind mountし直しても消えない
# - wrangler dev は現行バージョンでD1/KV/R2等のbindingをデフォルトでローカルのみで
#   エミュレートする（Cloudflareアカウントへの通信なしで動く）
set -eu

if [ ! -f .dev.vars ]; then
  # 注意: docker-composeの `environment:` で渡した値は、このプロセスの環境変数には
  # 入るが、wrangler devが読み込む env.X バインディングには自動反映されない
  # （wrangler devがWorkerへ渡すenvは wrangler.tomlの[vars]と.dev.varsだけを見る）。
  # そのため一度ここで.dev.varsとして書き出す必要がある（実機検証で判明）。
  cat > .dev.vars <<EOF
MCP_BEARER_TOKEN=${MCP_BEARER_TOKEN:-local-dev-token}
ORIGIN_BASE_URL=${ORIGIN_BASE_URL:-}
EOF
  echo "[docker-entrypoint] .dev.vars が無かったので生成しました（cms/worker/.dev.vars、以後は直接編集してよい）"
fi

echo "[docker-entrypoint] npm install..."
npm install

echo "[docker-entrypoint] starting wrangler dev on 0.0.0.0:8787"
exec npx wrangler dev --ip 0.0.0.0 --port 8787
