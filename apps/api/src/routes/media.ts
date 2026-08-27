import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { desc, eq } from "drizzle-orm";
import { media, news, products, seminars, services, type MediaRow } from "@bitcraft/db";
import type { Bindings } from "../lib/bindings";
import { getDb } from "../lib/db";
import { checkApiKey } from "../middleware/auth";

const PURPOSES = [
  "news_og",
  "seminar_hero",
  "seminar_card",
  "seminar_speaker",
  "product_image",
  "service_image",
  "other",
] as const;
const OWNER_TYPES = ["news", "seminar", "product", "service"] as const;

// ownerType単体からowner存在チェック対象のテーブルを引く（slug/idのみ使うので
// テーブルごとの列差異は問題にならない）。
function getOwnerTable(ownerType: (typeof OWNER_TYPES)[number]) {
  switch (ownerType) {
    case "news":
      return news;
    case "seminar":
      return seminars;
    case "product":
      return products;
    case "service":
      return services;
  }
}

// purpose('news_og'|'seminar_hero'|'seminar_card'|'product_image'|'service_image')
// が指定された場合、対応するレコードの *_image_key を自動更新する対応表（実装計画4章）。
// seminar_speakerはsections_json内(speakers.items[].photoKey)の一項目であり、
// 一意な単一カラムに対応しないため自動更新の対象外（呼び出し側でPATCH /v1/seminars/{slug}経由で設定する）。
const AUTO_LINK_COLUMN: Partial<
  Record<(typeof PURPOSES)[number], "ogImageKey" | "heroImageKey" | "cardImageKey" | "imageKey">
> = {
  news_og: "ogImageKey",
  seminar_hero: "heroImageKey",
  seminar_card: "cardImageKey",
  product_image: "imageKey",
  service_image: "imageKey",
};

const mediaResponseSchema = z.object({
  id: z.number(),
  key: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().nullable(),
  purpose: z.enum(PURPOSES).nullable(),
  ownerType: z.enum(OWNER_TYPES).nullable(),
  ownerSlug: z.string().nullable(),
  url: z.string(),
  uploadedAt: z.string(),
});

function toResponse(row: MediaRow): z.infer<typeof mediaResponseSchema> {
  return {
    id: row.id,
    key: row.r2Key,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    purpose: row.purpose,
    ownerType: row.ownerType,
    ownerSlug: row.ownerSlug,
    url: `https://bitcraft.work/media/${row.r2Key}`,
    uploadedAt: row.uploadedAt,
  };
}

// R2へのメディアアップロードAPI。既存の画像（講師写真・OGP画像等）はオフラインの
// generate_ogp.pyやwrangler r2 object putで投入してきたが、これをAPI経由でも
// 行えるようにする（実装計画4章・9章）。owner_type/owner_slug/purposeを指定すると
// 対応するnews/seminars/products/servicesレコードの*_image_keyを自動でリンクする。
export function registerMediaRoutes(app: OpenAPIHono<{ Bindings: Bindings }>) {
  // POST /v1/media -----------------------------------------------------------
  const uploadRoute = createRoute({
    method: "post",
    path: "/v1/media",
    summary: "メディア(画像)をR2へアップロード",
    tags: ["media"],
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              file: z.instanceof(File),
              key: z.string().optional().openapi({
                description: "R2オブジェクトキー。省略時は purpose/ownerType/ownerSlug から自動生成する",
              }),
              purpose: z.enum(PURPOSES).optional(),
              ownerType: z.enum(OWNER_TYPES).optional(),
              ownerSlug: z.string().optional(),
            }),
          },
        },
      },
    },
    responses: {
      201: { description: "アップロードしたメディア", content: { "application/json": { schema: mediaResponseSchema } } },
      400: { description: "リクエスト不正（fileが無い、keyの自動生成に必要な情報が無い等）" },
      401: { description: "認証エラー" },
      404: { description: "ownerType/ownerSlugに対応するレコードが見つからない" },
      409: { description: "同じkeyのメディアが既に存在する" },
    },
  });

  app.openapi(uploadRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { file, key: explicitKey, purpose, ownerType, ownerSlug } = c.req.valid("form");

    if (!file || typeof file === "string") {
      return c.json({ error: "fileが指定されていません" }, 400);
    }

    let key = explicitKey;
    if (!key) {
      if (!ownerType || !ownerSlug) {
        return c.json({ error: "keyを省略する場合はownerType/ownerSlugの指定が必要です" }, 400);
      }
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
      const base = purpose === "seminar_speaker" ? `speakers/${crypto.randomUUID()}` : (purpose ?? "file");
      key = `${ownerType}s/${ownerSlug}/${base}${ext}`;
    }

    const db = getDb(c.env);
    const existing = await db.select({ id: media.id }).from(media).where(eq(media.r2Key, key)).get();
    if (existing) {
      return c.json({ error: `key '${key}' は既に使用されています` }, 409);
    }

    if (ownerType && ownerSlug) {
      const table = getOwnerTable(ownerType);
      const owner = await db.select({ id: table.id }).from(table).where(eq(table.slug, ownerSlug)).get();
      if (!owner) {
        return c.json({ error: `${ownerType} '${ownerSlug}' が見つかりません` }, 404);
      }
    }

    const bytes = await file.arrayBuffer();
    await c.env.MEDIA.put(key, bytes, { httpMetadata: { contentType: file.type || "application/octet-stream" } });

    const inserted = await db
      .insert(media)
      .values({
        r2Key: key,
        contentType: file.type || "application/octet-stream",
        sizeBytes: bytes.byteLength,
        purpose: purpose ?? null,
        ownerType: ownerType ?? null,
        ownerSlug: ownerSlug ?? null,
      })
      .returning();

    const row = inserted[0];
    if (!row) return c.json({ error: "登録に失敗しました" }, 400);

    // purpose に対応するレコードの *_image_key を自動更新する
    const column = purpose ? AUTO_LINK_COLUMN[purpose] : undefined;
    if (column && ownerType === "seminar" && ownerSlug) {
      await db
        .update(seminars)
        .set({ [column]: key, updatedAt: new Date().toISOString() })
        .where(eq(seminars.slug, ownerSlug))
        .run();
    }
    if (purpose === "news_og" && ownerType === "news" && ownerSlug) {
      await db
        .update(news)
        .set({ ogImageKey: key, updatedAt: new Date().toISOString() })
        .where(eq(news.slug, ownerSlug))
        .run();
    }
    if (purpose === "product_image" && ownerType === "product" && ownerSlug) {
      await db
        .update(products)
        .set({ imageKey: key, updatedAt: new Date().toISOString() })
        .where(eq(products.slug, ownerSlug))
        .run();
    }
    if (purpose === "service_image" && ownerType === "service" && ownerSlug) {
      await db
        .update(services)
        .set({ imageKey: key, updatedAt: new Date().toISOString() })
        .where(eq(services.slug, ownerSlug))
        .run();
    }

    return c.json(toResponse(row), 201);
  });

  // GET /v1/media --------------------------------------------------------------
  const listRoute = createRoute({
    method: "get",
    path: "/v1/media",
    summary: "メディア一覧を取得",
    tags: ["media"],
    security: [{ bearerAuth: [] }],
    request: {
      query: z.object({
        ownerType: z.enum(OWNER_TYPES).optional(),
        ownerSlug: z.string().optional(),
      }),
    },
    responses: {
      200: { description: "メディア一覧", content: { "application/json": { schema: z.array(mediaResponseSchema) } } },
      401: { description: "認証エラー" },
    },
  });

  app.openapi(listRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { ownerType, ownerSlug } = c.req.valid("query");
    const db = getDb(c.env);
    const rows = await db.select().from(media).orderBy(desc(media.uploadedAt));
    const filtered = rows.filter(
      (r) => (!ownerType || r.ownerType === ownerType) && (!ownerSlug || r.ownerSlug === ownerSlug),
    );
    return c.json(filtered.map(toResponse), 200);
  });

  // DELETE /v1/media/{key} ------------------------------------------------------
  // R2キーはスラッシュを含むため、パスパラメータではなくクエリで指定する。
  const deleteRoute = createRoute({
    method: "delete",
    path: "/v1/media",
    summary: "メディアを削除（R2オブジェクトごと削除する）",
    tags: ["media"],
    security: [{ bearerAuth: [] }],
    request: { query: z.object({ key: z.string() }) },
    responses: {
      204: { description: "削除した" },
      401: { description: "認証エラー" },
      404: { description: "見つからない" },
    },
  });

  app.openapi(deleteRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { key } = c.req.valid("query");
    const db = getDb(c.env);
    const existing = await db.select({ id: media.id }).from(media).where(eq(media.r2Key, key)).get();
    if (!existing) return c.json({ error: "Not Found" }, 404);

    await c.env.MEDIA.delete(key);
    await db.delete(media).where(eq(media.id, existing.id)).run();
    return c.body(null, 204);
  });
}
