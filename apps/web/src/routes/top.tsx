import type { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { news } from "@bitcraft/db";
import type { Bindings } from "../lib/bindings";
import { getDb } from "../lib/db";
import { Layout } from "../render/layout";
import { TopPage } from "../render/pages/top";

export function registerTopRoute(app: Hono<{ Bindings: Bindings }>) {
  app.get("/", async (c) => {
    const db = getDb(c.env);
    // トップページの#newsは最新3件のみ（既存add-news運用ルールを踏襲、実装計画3章）
    const latestNews = await db
      .select()
      .from(news)
      .where(eq(news.status, "published"))
      .orderBy(desc(news.date))
      .limit(3);

    return c.html(
      <Layout
        title="bitcraft"
        description="bitcraftは「n=1から幸せにする」をミッションに掲げています。最初から広く汎用性を求めると、誰の幸せにもつながらないことがあります。だからこそ、一人の心からの幸せを大切にし、それが多くの人に愛されるサービスへと広がると信じています。"
        keywords="bitcraft,IT,design,島根,システム開発,webサイト,3DCG,安藤太亮"
        canonicalPath="/"
        isHome
      >
        <TopPage latestNews={latestNews} />
      </Layout>,
    );
  });
}
