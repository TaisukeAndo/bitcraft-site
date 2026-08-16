import { assertAllowedHtml, type NewsCreateInput } from "./validation";

export type NewsRow = Record<string, unknown>;

export async function listNews(db: D1Database, status?: "draft" | "published"): Promise<NewsRow[]> {
  const stmt = status
    ? db.prepare("SELECT * FROM news WHERE status = ? ORDER BY published_at DESC, id DESC").bind(status)
    : db.prepare("SELECT * FROM news ORDER BY published_at DESC, id DESC");
  const { results } = await stmt.all<NewsRow>();
  return results ?? [];
}

export async function getNewsBySlug(db: D1Database, slug: string): Promise<NewsRow | null> {
  const row = await db.prepare("SELECT * FROM news WHERE slug = ?").bind(slug).first<NewsRow>();
  return row ?? null;
}

export async function insertNews(db: D1Database, input: NewsCreateInput, actor: string): Promise<NewsRow | null> {
  assertAllowedHtml(input.body_html);

  const existing = await getNewsBySlug(db, input.slug);
  if (existing) {
    throw new Error(`slugが既に使われています: ${input.slug}`);
  }

  await db
    .prepare(
      `INSERT INTO news (slug, title, category, published_at, list_desc, body_html, keywords, description, status, show_on_top, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`
    )
    .bind(
      input.slug,
      input.title,
      input.category,
      input.published_at,
      input.list_desc,
      input.body_html,
      input.keywords ?? "",
      input.description ?? null,
      input.show_on_top === false ? 0 : 1,
      actor
    )
    .run();

  return getNewsBySlug(db, input.slug);
}

export async function updateNewsBySlug(
  db: D1Database,
  slug: string,
  patch: Record<string, unknown>,
  actor: string
): Promise<NewsRow | null> {
  const existing = await getNewsBySlug(db, slug);
  if (!existing) {
    throw new Error(`記事が見つかりません: ${slug}`);
  }
  if (typeof patch.body_html === "string") {
    assertAllowedHtml(patch.body_html);
  }

  const fields = Object.keys(patch).filter((key) => key !== "slug" && patch[key] !== undefined);
  if (fields.length === 0) {
    return existing;
  }

  const setClause = fields.map((field) => `${field} = ?`).join(", ") + ", updated_at = datetime('now')";
  const values = fields.map((field) => {
    const value = patch[field];
    if (field === "show_on_top") return value ? 1 : 0;
    return value;
  });

  await db
    .prepare(`UPDATE news SET ${setClause} WHERE slug = ?`)
    .bind(...values, slug)
    .run();

  await db
    .prepare(`INSERT INTO revisions (entity_type, entity_id, diff_json, actor) VALUES ('news', ?, ?, ?)`)
    .bind((existing as { id: number }).id, JSON.stringify(patch), actor)
    .run();

  return getNewsBySlug(db, slug);
}

export async function createPublishRequest(
  db: D1Database,
  entityType: string,
  slugs: string[],
  actor: string
): Promise<number> {
  const result = await db
    .prepare(`INSERT INTO publish_requests (entity_type, entity_ids, status, requested_by) VALUES (?, ?, 'queued', ?)`)
    .bind(entityType, JSON.stringify(slugs), actor)
    .run();
  return Number(result.meta.last_row_id);
}

export async function markPublishRequestDispatched(db: D1Database, id: number, runUrl?: string): Promise<void> {
  await db
    .prepare(`UPDATE publish_requests SET status = 'dispatched', github_run_url = ? WHERE id = ?`)
    .bind(runUrl ?? null, id)
    .run();
}
