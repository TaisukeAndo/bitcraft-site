import type { Hono } from "hono";
import { desc, eq, and } from "drizzle-orm";
import { news } from "@bitcraft/db";
import type { Bindings } from "../lib/bindings";
import { getDb } from "../lib/db";
import { mediaUrl } from "../lib/media-url";
import { Layout, renderPage } from "../render/layout";
import { NewsListPage } from "../render/pages/news-list";
import { NewsDetailPage } from "../render/pages/news-detail";

// Hono の `app.route(base, subApp)` はsubApp側の `get("/")` を
// `base`（末尾スラッシュなし）にマウントしてしまい、既存サイトのURL体系である
// 末尾スラッシュ付きパス（/news/ 等）を再現できない。そのため各ルートモジュールは
// サブアプリをマウントする形を取らず、フルパスを明示してメインアプリに直接
// 登録する関数をexportする。
export function registerNewsRoutes(app: Hono<{ Bindings: Bindings }>) {
  // /news/ : 公開済み全件、日付降順
  app.get("/news/", async (c) => {
    const db = getDb(c.env);
    const rows = await db
      .select()
      .from(news)
      .where(eq(news.status, "published"))
      .orderBy(desc(news.date));

    return c.html(
      renderPage(
        <Layout
          title="News | bitcraft"
          description="bitcraftからのお知らせ・最新情報の一覧です。サービスやセミナーに関するお知らせを掲載しています。"
          keywords="bitcraft,お知らせ,News,安藤太亮"
          canonicalPath="/news/"
          extraStyles={["/news/news-style.css"]}
        >
          <NewsListPage items={rows} />
        </Layout>,
      ),
    );
  });

  // /news/:slug/ : 単体取得。非公開・存在しないslugは404
  app.get("/news/:slug/", async (c) => {
    const db = getDb(c.env);
    const slug = c.req.param("slug");
    const row = await db
      .select()
      .from(news)
      .where(and(eq(news.slug, slug), eq(news.status, "published")))
      .get();

    if (!row) {
      return c.notFound();
    }

    const displayDate = row.date.replaceAll("-", ".");
    const ogImage = mediaUrl(row.ogImageKey) ?? undefined;

    return c.html(
      renderPage(
        <Layout
          title={`${row.title} | bitcraft`}
          description={row.metaDescription}
          keywords={row.metaKeywords ?? undefined}
          canonicalPath={`/news/${row.slug}/`}
          ogType="article"
          ogImage={ogImage ? `https://bitcraft.work${ogImage}` : undefined}
          extraStyles={["/news/news-detail-style.css"]}
          jsonLd={[
            {
              "@context": "https://schema.org",
              "@type": "NewsArticle",
              headline: row.title,
              datePublished: row.date,
              description: row.metaDescription,
              author: { "@type": "Organization", name: "bitcraft" },
            },
          ]}
        >
          <NewsDetailPage title={row.title} date={displayDate} tag={row.tag} bodyHtml={row.bodyHtml} />
        </Layout>,
      ),
    );
  });
}
