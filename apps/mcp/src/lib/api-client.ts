import type { Bindings } from "./bindings";

export type ApiResult<T = unknown> = { ok: boolean; status: number; data: T };

// apps/apiへのService Binding越しHTTP呼び出しをまとめるヘルパー。
// URLのホスト名部分はService Binding経由では使われないダミー値
// （apps/webのc.env.API.fetch(...)と同じ規約に揃えている）。
// 認証はAuthorizationヘッダをそのまま転送するだけで、認証ロジック（トークンの
// ハッシュ照合等）の単一ソースはapps/api側に保つ（実装計画5章:
// 「mcpはapiに聞くだけ」）。
export async function callApi<T = unknown>(
  env: Bindings,
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const res = await env.API.fetch(`https://internal${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = (text ? JSON.parse(text) : undefined) as T;
  return { ok: res.ok, status: res.status, data };
}

// multipart/form-data(メディアアップロード)専用。
export async function callApiForm<T = unknown>(
  env: Bindings,
  token: string,
  path: string,
  form: FormData,
): Promise<ApiResult<T>> {
  const res = await env.API.fetch(`https://internal${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await res.text();
  const data = (text ? JSON.parse(text) : undefined) as T;
  return { ok: res.ok, status: res.status, data };
}
