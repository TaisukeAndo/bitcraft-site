import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { eq, desc } from "drizzle-orm";
import { seminars, applications, emailTemplates, applicationEmailSends } from "@bitcraft/db";
import {
  submitApplicationSchema,
  updateApplyFormSchema,
  validateApplyFormAnswers,
  type ApplicationAnswers,
  type SeminarApplyForm,
} from "@bitcraft/shared";
import type { Bindings } from "../lib/bindings";
import { getDb } from "../lib/db";
import { checkApiKey } from "../middleware/auth";
import { dispatchTemplatedEmail, toDispatchContent, DEFAULT_ON_SUBMIT_CONTENT } from "../lib/email-dispatch";

const applicationAnswersSchema = z.record(z.string(), z.union([z.string(), z.array(z.string())]));

const applicationEmailSendResponseSchema = z.object({
  key: z.string(),
  status: z.enum(["sent", "failed"]),
  error: z.string().nullable(),
  sentAt: z.string(),
});

const applicationResponseSchema = z.object({
  id: z.number(),
  seminarSlug: z.string(),
  answers: applicationAnswersSchema,
  applicantName: z.string().nullable(),
  applicantEmail: z.string().nullable(),
  status: z.enum(["received", "confirmed", "cancelled"]),
  emails: z.array(applicationEmailSendResponseSchema),
  submittedAt: z.string(),
});

// セミナーの申込フォーム(apply_form_json)・申込データ(applications)を扱う
// エンドポイント群。Googleフォームへのno-cors直POストは廃止し、CMS API経由で
// D1へ直接保存する自前実装に置き換えた（実装計画4章、ユーザー要望対応）。
// 申込確認メール以外の複数メール（事前準備案内・前日リマインド等）は
// routes/emails.ts の email_templates CRUDで管理する。
export function registerSeminarApplicationRoutes(app: OpenAPIHono<{ Bindings: Bindings }>) {
  // PATCH /v1/seminars/{slug}/apply-form ---------------------------------
  // セミナーごとに申込フォームの入力項目を自由に設定できる管理者向けAPI。
  const updateApplyFormRoute = createRoute({
    method: "patch",
    path: "/v1/seminars/{slug}/apply-form",
    summary: "セミナーの申込フォーム定義を更新",
    tags: ["seminars"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ slug: z.string() }),
      body: {
        content: { "application/json": { schema: updateApplyFormSchema } },
      },
    },
    responses: {
      200: {
        description: "更新後のフォーム定義",
        content: { "application/json": { schema: updateApplyFormSchema } },
      },
      401: { description: "認証エラー" },
      404: { description: "セミナーが見つからない" },
    },
  });

  app.openapi(updateApplyFormRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { slug } = c.req.valid("param");
    const body = c.req.valid("json");
    const db = getDb(c.env);

    const existing = await db.select({ id: seminars.id }).from(seminars).where(eq(seminars.slug, slug)).get();
    if (!existing) {
      return c.json({ error: "Not Found" }, 404);
    }

    await db
      .update(seminars)
      .set({ applyFormJson: JSON.stringify(body), updatedAt: new Date().toISOString() })
      .where(eq(seminars.slug, slug))
      .run();

    return c.json(body, 200);
  });

  // POST /v1/seminars/{slug}/applications ---------------------------------
  // 公開・認証不要の申込エンドポイント。誰でも申し込めるためBearer認証は課さない
  // （実装計画のCMS API認証はあくまで管理者/AIエージェント向け操作の保護が目的）。
  const submitApplicationRoute = createRoute({
    method: "post",
    path: "/v1/seminars/{slug}/applications",
    summary: "セミナーへ申し込む（公開・認証不要）",
    tags: ["applications"],
    request: {
      params: z.object({ slug: z.string() }),
      body: {
        content: { "application/json": { schema: submitApplicationSchema } },
      },
    },
    responses: {
      201: {
        description: "申込を受け付けた",
        content: { "application/json": { schema: z.object({ id: z.number(), submittedAt: z.string() }) } },
      },
      400: {
        description: "バリデーションエラー、または募集期限超過・フォーム未設定",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
              details: z.array(z.object({ fieldId: z.string(), message: z.string() })).optional(),
            }),
          },
        },
      },
      404: { description: "セミナーが見つからない" },
    },
  });

  app.openapi(submitApplicationRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const { answers } = c.req.valid("json");
    const db = getDb(c.env);

    const seminar = await db.select().from(seminars).where(eq(seminars.slug, slug)).get();
    if (!seminar) {
      return c.json({ error: "Not Found" }, 404);
    }
    if (!seminar.applyFormJson) {
      return c.json({ error: "このセミナーには申込フォームが設定されていません" }, 400);
    }

    const form = JSON.parse(seminar.applyFormJson) as SeminarApplyForm;
    const errors = validateApplyFormAnswers(form, answers);
    if (errors.length > 0) {
      return c.json({ error: "入力内容に誤りがあります", details: errors }, 400);
    }

    const nameField = form.fields.find((f) => f.id === "name" || f.label.includes("お名前"));
    const emailField = form.fields.find((f) => f.type === "email");
    const applicantName = nameField ? answers[nameField.id] : undefined;
    const applicantEmail = emailField ? answers[emailField.id] : undefined;
    const applicantNameStr = typeof applicantName === "string" ? applicantName : null;
    const applicantEmailStr = typeof applicantEmail === "string" ? applicantEmail : null;

    const inserted = await db
      .insert(applications)
      .values({
        seminarId: seminar.id,
        seminarSlug: seminar.slug,
        answersJson: JSON.stringify(answers),
        applicantName: applicantNameStr,
        applicantEmail: applicantEmailStr,
      })
      .returning({ id: applications.id, submittedAt: applications.submittedAt });

    const row = inserted[0];
    if (!row) {
      return c.json({ error: "申込の保存に失敗しました" }, 400);
    }

    // 申込時点(on_submit)のメールを全て送信する（ベストエフォート、申込自体の
    // 成否には影響させない）。1件も設定されていないセミナーでは、申込確認メール
    // PR時点の挙動を退行させないようデフォルト文面にフォールバックする。
    //
    // メール送信(Cloudflare Email SendingへのHTTP往復、テンプレート数だけ発生)を
    // レスポンス返却前に待つと、申込のたびに数百ms〜数秒の体感遅延になり、その間に
    // ユーザーが送信ボタンを連打してしまう一因になっていた。DB保存が完了した
    // 時点で201を返し、メール送信自体はc.executionCtx.waitUntil()でレスポンス後も
    // Workerを生かしたままバックグラウンド実行する（auth.tsのlast_used_at更新と
    // 同じパターン）。あわせて複数テンプレートを直列awaitしていたのを並列化した。
    c.executionCtx.waitUntil(
      (async () => {
        const onSubmitTemplates = await db
          .select()
          .from(emailTemplates)
          .where(eq(emailTemplates.seminarId, seminar.id));
        const enabledOnSubmit = onSubmitTemplates.filter((t) => t.triggerType === "on_submit" && t.enabled);

        const toSend =
          enabledOnSubmit.length > 0
            ? enabledOnSubmit.map((t) => ({ id: t.id as number | null, key: t.key, content: toDispatchContent(t) }))
            : [{ id: null, key: "confirmation", content: DEFAULT_ON_SUBMIT_CONTENT }];

        await Promise.all(
          toSend.map(async (item) => {
            const result = await dispatchTemplatedEmail(
              c.env,
              seminar,
              item.content,
              answers as ApplicationAnswers,
              applicantNameStr,
              applicantEmailStr,
            );
            if (result.status === "skipped") return; // 宛先不明（申込フォームにemailフィールドが無い等）

            if (item.id === null) {
              // フォールバック文面(DEFAULT_ON_SUBMIT_CONTENT)にはemail_templatesの
              // 実レコードが無くapplication_email_sends(NOT NULL FK)へは記録できないため、
              // applicationsの非推奨カラム(confirmationEmailStatus/Error)を再利用して
              // 送信結果を残す。元々このカラムは複数メール対応前の単一確認メール用に
              // 存在していたもので、フォールバック=単一確認メールという性質に合致する。
              // これが無いと配信失敗(検証済み宛先以外へのCloudflare Email Sending制限等)が
              // 一切記録されず、運用者が気づく手段が無かった（実際に本番で踏んだ不具合）。
              await db
                .update(applications)
                .set({
                  confirmationEmailStatus: result.status,
                  confirmationEmailError: result.status === "failed" ? result.error : null,
                })
                .where(eq(applications.id, row.id))
                .run();
              return;
            }

            await db
              .insert(applicationEmailSends)
              .values({
                applicationId: row.id,
                emailTemplateId: item.id,
                status: result.status,
                error: result.status === "failed" ? result.error : null,
              })
              .onConflictDoNothing()
              .run();
          }),
        );
      })(),
    );

    return c.json({ id: row.id, submittedAt: row.submittedAt }, 201);
  });

  // GET /v1/seminars/{slug}/applications ---------------------------------
  const listApplicationsRoute = createRoute({
    method: "get",
    path: "/v1/seminars/{slug}/applications",
    summary: "セミナーの申込一覧を取得（管理者向け）",
    tags: ["applications"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ slug: z.string() }),
    },
    responses: {
      200: {
        description: "申込一覧",
        content: { "application/json": { schema: z.array(applicationResponseSchema) } },
      },
      401: { description: "認証エラー" },
      404: { description: "セミナーが見つからない" },
    },
  });

  app.openapi(listApplicationsRoute, async (c) => {
    const authError = await checkApiKey(c);
    if (authError) return authError;

    const { slug } = c.req.valid("param");
    const db = getDb(c.env);

    const seminar = await db.select({ id: seminars.id }).from(seminars).where(eq(seminars.slug, slug)).get();
    if (!seminar) {
      return c.json({ error: "Not Found" }, 404);
    }

    const rows = await db
      .select()
      .from(applications)
      .where(eq(applications.seminarSlug, slug))
      .orderBy(desc(applications.submittedAt));

    const sends = await db
      .select({
        applicationId: applicationEmailSends.applicationId,
        status: applicationEmailSends.status,
        error: applicationEmailSends.error,
        sentAt: applicationEmailSends.sentAt,
        key: emailTemplates.key,
      })
      .from(applicationEmailSends)
      .innerJoin(emailTemplates, eq(applicationEmailSends.emailTemplateId, emailTemplates.id))
      .where(eq(emailTemplates.seminarId, seminar.id));

    return c.json(
      rows.map((r) => {
        const templatedEmails = sends
          .filter((s) => s.applicationId === r.id)
          .map((s) => ({ key: s.key, status: s.status, error: s.error, sentAt: s.sentAt }));
        // フォールバック文面(email_templates未設定セミナー)の送信結果は
        // application_email_sendsではなくapplications.confirmationEmailStatusに
        // 記録される（submitApplicationRoute参照）。同じemails配列で見えるよう合流する。
        const fallbackEmail =
          templatedEmails.length === 0 && r.confirmationEmailStatus
            ? [{ key: "confirmation", status: r.confirmationEmailStatus, error: r.confirmationEmailError, sentAt: r.submittedAt }]
            : [];

        return {
          id: r.id,
          seminarSlug: r.seminarSlug,
          answers: JSON.parse(r.answersJson) as z.infer<typeof applicationAnswersSchema>,
          applicantName: r.applicantName,
          applicantEmail: r.applicantEmail,
          status: r.status,
          emails: [...templatedEmails, ...fallbackEmail],
          submittedAt: r.submittedAt,
        };
      }),
      200,
    );
  });
}
