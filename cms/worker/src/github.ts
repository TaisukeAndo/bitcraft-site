export interface GithubEnv {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string; // "owner/repo" 形式
}

/**
 * .github/workflows/cms-news-build.yml を workflow_dispatch で起動する。
 * ワークフロー側はDBのpublished記事全件からnews/以下とindex.htmlの#newsセクションを
 * 再生成し、ブランチ作成＋Pull Request作成まで行う（mainへの直接pushはしない）。
 */
export async function dispatchBuildWorkflow(
  env: GithubEnv,
  payload: { requestId: number; slugs: string[] }
): Promise<{ status: number; dispatchedAt: string }> {
  const [owner, repo] = env.GITHUB_REPO.split("/");
  if (!owner || !repo) {
    throw new Error(`GITHUB_REPOの形式が不正です（"owner/repo"で設定してください）: ${env.GITHUB_REPO}`);
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/cms-news-build.yml/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "bitcraft-cms-worker",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref: "main",
      inputs: {
        request_id: String(payload.requestId),
        slugs: payload.slugs.join(","),
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub Actionsの起動に失敗しました (HTTP ${res.status}): ${text}`);
  }

  return { status: res.status, dispatchedAt: new Date().toISOString() };
}
