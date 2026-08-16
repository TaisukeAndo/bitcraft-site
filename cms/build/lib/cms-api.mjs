// cms/worker（MCPサーバー）が公開する内部API `/internal/published-news` への薄いクライアント。
// CMS_API_URL はローカルDocker実行時は `http://worker:8787`、GitHub Actions実行時は
// deploy済みWorkerの公開URL（`https://bitcraft-cms.<account>.workers.dev`）を指す。
// どちらの場合もWorker経由でD1を読むので、build.mjs自体はCloudflareの認証情報を持たない。

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が設定されていません`);
  return value;
}

export async function fetchPublishedNews() {
  const baseUrl = requireEnv("CMS_API_URL").replace(/\/+$/, "");
  const token = requireEnv("CMS_API_TOKEN");

  const res = await fetch(`${baseUrl}/internal/published-news`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`CMS APIへの問い合わせに失敗しました (HTTP ${res.status}): ${await res.text()}`);
  }

  const json = await res.json();
  return json.news ?? [];
}
