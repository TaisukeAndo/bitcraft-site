import type { Hono } from "hono";
import type { Bindings } from "../lib/bindings";
import { Layout, renderPage } from "../render/layout";
import { ContactPage } from "../render/pages/contact";
import { PolicyPage } from "../render/pages/policy";

// D1に依存しない静的コンテンツページ（実装計画3章）。
export function registerStaticPageRoutes(app: Hono<{ Bindings: Bindings }>) {
  app.get("/contact/", (c) => {
    return c.html(
      renderPage(
        <Layout
          title="お問い合わせ | bitcraft"
          description="bitcraftは「n=1から幸せにする」をミッションに掲げています。最初から広く汎用性を求めると、誰の幸せにもつながらないことがあります。だからこそ、一人の心からの幸せを大切にし、それが多くの人に愛されるサービスへと広がると信じています。"
          keywords="bitcraft,IT,design,島根,システム開発,webサイト,3DCG,安藤太亮"
          canonicalPath="/contact/"
          extraStyles={["/contact/contact-style.css"]}
        >
          <ContactPage />
        </Layout>,
      ),
    );
  });

  // お問い合わせデータをapps/apiへService Binding経由で委譲する
  // （apps/webはD1に書き込まない、実装計画のコード規約に従う。
  // セミナー申込(routes/seminars.ts)と同じパターン）。
  app.post("/contact/", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "リクエストの形式が正しくありません" }, 400);
    }

    const apiRes = await c.env.API.fetch("https://internal/v1/contacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const resBody = await apiRes.text();
    return new Response(resBody, {
      status: apiRes.status,
      headers: { "content-type": "application/json" },
    });
  });

  app.get("/policy/", (c) => {
    return c.html(
      renderPage(
        <Layout
          title="プライバシーポリシー | bitcraft"
          description="bitcraftは「n=1から幸せにする」をミッションに掲げています。最初から広く汎用性を求めると、誰の幸せにもつながらないことがあります。だからこそ、一人の心からの幸せを大切にし、それが多くの人に愛されるサービスへと広がると信じています。"
          keywords="bitcraft,IT,design,島根,システム開発,webサイト,3DCG,安藤太亮"
          canonicalPath="/policy/"
          extraStyles={["/policy/privacy-policy-style.css"]}
        >
          <PolicyPage />
        </Layout>,
      ),
    );
  });
}
