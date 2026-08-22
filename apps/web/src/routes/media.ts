import type { Hono } from "hono";
import type { Bindings } from "../lib/bindings";

// R2(bitcraft-media)をストリーミング配信する。公開URLは同一オリジンの
// /media/<key> とし、OGPクローラー等との互換性を高める（実装計画3章）。
export function registerMediaRoutes(app: Hono<{ Bindings: Bindings }>) {
  app.get("/media/*", async (c) => {
    const key = c.req.path.replace(/^\/media\//, "");
    const object = await c.env.MEDIA.get(key);

    if (!object) {
      return c.notFound();
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");

    return new Response(object.body, { headers });
  });
}
