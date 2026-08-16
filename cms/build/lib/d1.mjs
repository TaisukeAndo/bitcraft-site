// Cloudflare D1 REST APIへの薄いラッパー。GitHub Actions実行時にNode組み込みのfetchを使う
// （追加npm依存なし）。

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が設定されていません`);
  return value;
}

export async function queryD1(sql, params = []) {
  const accountId = requireEnv("CF_ACCOUNT_ID");
  const databaseId = requireEnv("CF_D1_DATABASE_ID");
  const apiToken = requireEnv("CF_API_TOKEN");

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    throw new Error(`D1 query failed (HTTP ${res.status}): ${await res.text()}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(`D1 query returned an error: ${JSON.stringify(json.errors)}`);
  }

  // Cloudflare REST APIは複数result setをまとめて配列で返す。ここでは単一SELECT前提。
  return json.result?.[0]?.results ?? [];
}
