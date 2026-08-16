# cms/worker のローカル開発用イメージ。
# 本番はCloudflare Workersにdeployするだけなので、このDockerfileは
# ローカルでの `wrangler dev`（MCPサーバー起動）専用。イメージ自体は
# デプロイには使わない（deployはcms/README.mdの手順で `wrangler deploy` を直接実行する）。
#
# alpine(musl libc)ではなくbookworm-slim(glibc)を使う。wranglerが内部で使う
# workerdのネイティブバイナリはglibc前提でビルドされており、musl環境では
# バイナリ自体は存在してもspawnが `ENOENT` で失敗する（実機検証で確認済み）。
FROM node:22-bookworm-slim

WORKDIR /app

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8787

ENTRYPOINT ["docker-entrypoint.sh"]
