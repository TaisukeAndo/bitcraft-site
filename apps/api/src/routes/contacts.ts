import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { desc, eq } from "drizzle-orm";
import { contacts, type ContactRow } from "@bitcraft/db";
import { APPLICATION_EMAIL_SENDER_DOMAIN, contactStatusUpdateSchema, submitContactSchema } from "@bitcraft/shared";
import type { Bindings } from "../lib/bindings";
import { getDb } from "../lib/db";
import { checkApiKey } from "../middleware/auth";

// 運用者への通知メールの宛先。@bitcraft.work宛先の前例が無く、現状サイト内で
// 実際に使われている連絡先(トップページの「メールを送る」CTA)と同じ運用者の
// 個人アドレスに揃える（ユーザー確認済み）。
const ADMIN_NOTIFICATION_EMAIL = "ando1202taisuke@gmail.com";
const FROM_EMAIL = `noreply@${APPLICATION_EMAIL_SENDER_DOMAIN}`;
const FROM_NAME = "bitcraft";

const contactResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  affiliation: z.string(),
  inquiryType: z.string(),
  message: z.string(),
  status: z.enum(["received", "replied", "closed"]),
  notificationEmail: z.object({ status: z.enum(["sent", "failed"]).nullable(), error: z.string().nullable() }),
  confirmationEmail: z.object({ status: z.enum(["sent", "failed"]).nullable(), error: z.string().nullable() }),
  submittedAt: z.string(),
});

function toResponse(row: ContactRow): z.infer<typeof contactResponseSchema> {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    affiliation: row.affiliation,
    inquiryType: row.inquiryType,
    message: row.message,
    status: row.status,
    notificationEmail: { status: row.notificationEmailStatus, error: row.notificationEmailError },
    confirmationEmail: { status: row.confirmationEmailStatus, error: row.confirmationEmailError },
    submittedAt: row.submittedAt,
  };
}

type SendResult = { status: "sent" } | { status: "failed"; error: string };

async function sendEmail(
  env: Bindings,
  to: string,
  subject: string,
  text: string,
): Promise<SendResult> {
  try {
    await env.EMAIL.send({ to, from: { email: FROM_EMAIL, name: FROM_NAME }, subject, text });
    return { status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return { status: "failed", error: message };
  }
}

// お問い合わせフォームのCMS API。セミナー申込(routes/seminars.ts)と同じ構造
// （Googleフォームのno-cors直POSTを廃止し、D1へ直接保存＋メール送信を自前実装
// する）を踏襲する。ただしお問い合わせは項目・メール文面が固定のため、
// seminarsのようなapply_form_json/email_templatesに相当する可変設定は持たない。
export function registerContactRoutes(app: OpenAPIHono<{ Bindings: Bindings }>) {
  // POST /v1/contacts -------------------------------------------------------
  // 公開・認証不要（セミナー申込のsubmitApplicationRouteと同じ理由）。
  const submitRoute = createRoute({
    method: "post",
    path: "/v1/contacts",
    summary: "お問い合わせを送信する（公開・認証不要）",
    tags: ["contacts"],
    request: {
      body: { content: { "application/json": { schema: submitContactSchema } } },
    },
    responses: {
      201: {
        description: "お問い合わせを受け付けた",
        content: { "application/json": { schema: z.object({ id: z.number(), submittedAt: z.string() }) } },
      },
      400: {
        description: "バリデーションエラー",
        content: { "application/json": { schema: z.object({ error: z.string() }) } },
      },
    },
  });

  app.openapi(submitRoute, async (c) => {
    const body = c.req.valid("json");
    const db = getDb(c.env);

    const inserted = await db
      .insert(contacts)
      .values({
        name: body.name,
        email: body.email,
        affiliation: body.affiliation,
        inquiryType: body.inquiryType,
        message: body.message,
        privacyConsent: 1,
      })
      .returning({ id: contacts.id, submittedAt: contacts.submittedAt });

    const row = inserted[0];
    if (!row) {
      return c.json({ error: "お問い合わせの保存に失敗しました" }, 400);
    }

    // 運用者への通知・問い合わせ者への確認、どちらもベストエフォート送信
    // （申込自体の成否には影響させない。セミナー申込と同じ方針）。
    // メール送信(Cloudflare Email SendingへのHTTP往復)をレスポンス返却前に
    // 待つと、フォーム送信のたびに数百ms〜数秒の体感遅延になり、その間に
    // ユーザーが送信ボタンを連打してしまう一因になっていた。DB保存が
    // 完了した時点で201を返し、メール送信自体はc.executionCtx.waitUntil()で
    // レスポンス後もWorkerを生かしたままバックグラウンド実行する
    // （auth.tsのlast_used_at更新と同じパターン）。
    const inquiryDetail = `お名前: ${body.name}
メールアドレス: ${body.email}
ご所属: ${body.affiliation}
お問い合わせ種別: ${body.inquiryType}

ご相談内容:
${body.message}`;

    c.executionCtx.waitUntil(
      (async () => {
        const [notification, confirmation] = await Promise.all([
          sendEmail(c.env, ADMIN_NOTIFICATION_EMAIL, `【bitcraft】お問い合わせ: ${body.inquiryType}`, inquiryDetail),
          sendEmail(
            c.env,
            body.email,
            "【bitcraft】お問い合わせありがとうございます",
            `${body.name} 様

この度はお問い合わせいただき、誠にありがとうございます。
以下の内容で受け付けいたしました。担当者より追ってご連絡いたしますので、今しばらくお待ちください。

お問い合わせ種別: ${body.inquiryType}

ご相談内容:
${body.message}

--
bitcraft
https://bitcraft.work/`,
          ),
        ]);

        await db
          .update(contacts)
          .set({
            notificationEmailStatus: notification.status,
            notificationEmailError: notification.status === "failed" ? notification.error : null,
            confirmationEmailStatus: confirmation.status,
            confirmationEmailError: confirmation.status === "failed" ? confirmation.error : null,
          })
          .where(eq(contacts.id, row.id))
          .run();
      })(),
    );

    return c.json({ id: row.id, submittedAt: row.submittedAt }, 201);
  });

  // GET /v1/contacts ---------------------------------------------------------
  const listRoute = createRoute({
    method: "get",
    path: "/v1/contacts",
    summary: "お問い合わせ一覧を取得（管理者向け）",
    tags: ["contacts"],
    security: [{ bearerAuth: [] }],
    request: {
      query: z.object({ status: z.enum(["received", "replied", "closed"]).optional() }),
    },
    responses: {
      200: {
        description: "お問い合わせ一覧（submittedAt降順）",
        content: { "application/json": { schema: z.array(contactResponseSchema) } },
      },
      401: { description: "認証エラー" },
    },
  });

  app.openapi(listRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { status } = c.req.valid("query");
    const db = getDb(c.env);
    const rows = await db
      .select()
      .from(contacts)
      .where(status ? eq(contacts.status, status) : undefined)
      .orderBy(desc(contacts.submittedAt));

    return c.json(rows.map(toResponse), 200);
  });

  // PATCH /v1/contacts/{id}/status --------------------------------------------
  const updateStatusRoute = createRoute({
    method: "patch",
    path: "/v1/contacts/{id}/status",
    summary: "お問い合わせの対応状況(status)を更新",
    tags: ["contacts"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      body: { content: { "application/json": { schema: contactStatusUpdateSchema } } },
    },
    responses: {
      200: { description: "更新後のお問い合わせ", content: { "application/json": { schema: contactResponseSchema } } },
      401: { description: "認証エラー" },
      404: { description: "見つからない" },
    },
  });

  app.openapi(updateStatusRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { id } = c.req.valid("param");
    const { status } = c.req.valid("json");
    const db = getDb(c.env);

    const existing = await db.select({ id: contacts.id }).from(contacts).where(eq(contacts.id, id)).get();
    if (!existing) return c.json({ error: "Not Found" }, 404);

    await db.update(contacts).set({ status }).where(eq(contacts.id, id)).run();

    const updated = await db.select().from(contacts).where(eq(contacts.id, id)).get();
    return c.json(toResponse(updated!), 200);
  });
}
