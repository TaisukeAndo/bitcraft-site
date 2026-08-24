import type { Hono } from "hono";
import { eq } from "drizzle-orm";
import { seminars } from "@bitcraft/db";
import { isPastEvent, isRegistrationClosed, type SeminarApplyForm, type SeminarSections } from "@bitcraft/shared";
import type { Bindings } from "../lib/bindings";
import { getDb } from "../lib/db";
import { mediaUrl } from "../lib/media-url";
import { Layout, renderPage } from "../render/layout";
import { SeminarListPage } from "../render/pages/seminar-list";
import { SeminarDetailPage } from "../render/pages/seminar-detail";
import { SeminarApplyPage } from "../render/pages/seminar-apply";

// news.tsx と同じ理由（app.route()は末尾スラッシュを再現できない）で、
// フルパスを明示するregisterXxxRoutes(app)方式を採用する。
export function registerSeminarRoutes(app: Hono<{ Bindings: Bindings }>) {
  // /service/seminar/ : 開催予定/過去開催の振り分けはevent_date(JST)から都度計算する
  // 派生値であり、DBには保存しない（実装計画 2章）。
  app.get("/service/seminar/", async (c) => {
    const db = getDb(c.env);
    const rows = await db.select().from(seminars);

    const upcoming = rows.filter((s) => !isPastEvent(s.eventDate)).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    const past = rows
      .filter((s) => isPastEvent(s.eventDate))
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate));

    return c.html(
      renderPage(
        <Layout
          title="Seminar | bitcraft"
          description="bitcraftが提供するセミナー・ワークショップ一覧。AIツールの活用、システム開発、デザインなど、実践的なスキルを身につけるための1Dayセミナーを開催しています。"
          keywords="bitcraft,セミナー,AI,Claude Code,ワークショップ,安藤太亮"
          canonicalPath="/service/seminar/"
          extraStyles={["/service/seminar/seminar-style.css"]}
        >
          <SeminarListPage upcoming={upcoming} past={past} />
        </Layout>,
      ),
    );
  });

  // /service/seminar/:slug/ : detail_page=0（過去実績のカードのみ）は404扱い
  app.get("/service/seminar/:slug/", async (c) => {
    const db = getDb(c.env);
    const slug = c.req.param("slug");
    const row = await db.select().from(seminars).where(eq(seminars.slug, slug)).get();

    if (!row || !row.detailPage) {
      return c.notFound();
    }

    const sections = JSON.parse(row.sectionsJson) as SeminarSections;
    const registrationClosed = isRegistrationClosed(row.eventDate);
    const ogImage = mediaUrl(row.cardImageKey);

    return c.html(
      renderPage(
        <Layout
          title={`${row.title.replace(/<br>/g, "")} | bitcraft`}
          description={row.metaDescription}
          keywords={row.metaKeywords ?? undefined}
          canonicalPath={`/service/seminar/${row.slug}/`}
          ogImage={ogImage ? `https://bitcraft.work${ogImage}` : undefined}
          extraStyles={[`/service/seminar/${row.slug}/seminar-detail-style.css`]}
          bodyScripts={[]}
          jsonLd={[
            {
              "@context": "https://schema.org",
              "@type": "Event",
              name: row.title.replace(/<br>/g, ""),
              startDate: row.eventDate,
              eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
              eventStatus: registrationClosed
                ? "https://schema.org/EventScheduled"
                : "https://schema.org/EventScheduled",
              description: row.metaDescription,
              organizer: { "@type": "Organization", name: "bitcraft", url: "https://bitcraft.work/" },
            },
          ]}
        >
          <SeminarDetailPage seminar={row} sections={sections} registrationClosed={registrationClosed} />
        </Layout>,
      ),
    );
  });

  // /service/seminar/:slug/apply/ : 締切のみが申込ページのロック条件
  // （実装計画: apply-locked廃止という過去の意思決定を踏襲、複合条件は導入しない）。
  app.get("/service/seminar/:slug/apply/", async (c) => {
    const db = getDb(c.env);
    const slug = c.req.param("slug");
    const row = await db.select().from(seminars).where(eq(seminars.slug, slug)).get();

    if (!row || !row.detailPage || !row.applyFormJson) {
      return c.notFound();
    }

    const form = JSON.parse(row.applyFormJson) as SeminarApplyForm;
    const registrationClosed = isRegistrationClosed(row.eventDate);

    return c.html(
      renderPage(
        <Layout
          title={`参加申し込み | ${row.title.replace(/<br>/g, "")}`}
          description={`${row.title.replace(/<br>/g, "")}（${row.eventDateDisplay ?? row.eventDate}）の参加申し込みフォームです。`}
          canonicalPath={`/service/seminar/${row.slug}/apply/`}
          extraStyles={[`/service/seminar/${row.slug}/apply/apply-style.css`, "/css/form-submit.css"]}
          bodyScripts={["/js/form-submit.js"]}
        >
          <SeminarApplyPage seminar={row} form={form} registrationClosed={registrationClosed} />
        </Layout>,
      ),
    );
  });

  // POST /service/seminar/:slug/apply/ : 申込データをapps/apiへService Binding経由で
  // 委譲する（apps/webはD1に書き込まない、実装計画のコード規約に従う）。
  // Custom Domain未接続の現段階でも同一アカウント内Worker間で疎通できる。
  app.post("/service/seminar/:slug/apply/", async (c) => {
    const slug = c.req.param("slug");
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "リクエストの形式が正しくありません" }, 400);
    }

    const apiRes = await c.env.API.fetch(`https://internal/v1/seminars/${slug}/applications`, {
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
}
