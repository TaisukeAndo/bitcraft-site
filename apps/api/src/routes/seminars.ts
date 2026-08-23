import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { eq, desc } from "drizzle-orm";
import { seminars, applications } from "@bitcraft/db";
import {
  submitApplicationSchema,
  updateApplyFormSchema,
  updateConfirmationEmailSchema,
  validateApplyFormAnswers,
  type ApplicationAnswers,
  type SeminarApplyForm,
} from "@bitcraft/shared";
import type { Bindings } from "../lib/bindings";
import { getDb } from "../lib/db";
import { checkApiKey } from "../middleware/auth";
import { sendConfirmationEmail } from "../lib/confirmation-email";

const applicationAnswersSchema = z.record(z.string(), z.union([z.string(), z.array(z.string())]));

const applicationResponseSchema = z.object({
  id: z.number(),
  seminarSlug: z.string(),
  answers: applicationAnswersSchema,
  applicantName: z.string().nullable(),
  applicantEmail: z.string().nullable(),
  status: z.enum(["received", "confirmed", "cancelled"]),
  confirmationEmailStatus: z.enum(["sent", "failed"]).nullable(),
  confirmationEmailError: z.string().nullable(),
  submittedAt: z.string(),
});

// セミナーの申込フォーム(apply_form_json)・申込データ(applications)を扱う
// エンドポイント群。Googleフォームへのno-cors直POストは廃止し、CMS API経由で
// D1へ直接保存する自前実装に置き換えた（実装計画4章、ユーザー要望対応）。
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

  // PATCH /v1/seminars/{slug}/confirmation-email ---------------------------
  // セミナーごとに申込確認メールの差出人名・アドレス・件名・本文を自由に
  // 設定できる管理者向けAPI（ユーザー要望対応）。未設定のセミナーは
  // DEFAULT_APPLICATION_EMAIL_TEMPLATE(packages/shared)にフォールバックする。
  const updateConfirmationEmailRoute = createRoute({
    method: "patch",
    path: "/v1/seminars/{slug}/confirmation-email",
    summary: "セミナーの申込確認メールのテンプレートを更新",
    tags: ["seminars"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ slug: z.string() }),
      body: {
        content: { "application/json": { schema: updateConfirmationEmailSchema } },
      },
    },
    responses: {
      200: {
        description: "更新後のテンプレート",
        content: { "application/json": { schema: updateConfirmationEmailSchema } },
      },
      400: { description: "バリデーションエラー（fromEmailのドメイン不一致等）" },
      401: { description: "認証エラー" },
      404: { description: "セミナーが見つからない" },
    },
  });

  app.openapi(updateConfirmationEmailRoute, async (c) => {
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
      .set({ confirmationEmailJson: JSON.stringify(body), updatedAt: new Date().toISOString() })
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

    // 確認メール送信は申込の成否に影響させない（ベストエフォート）。送信結果は
    // applicationsに記録し、管理者APIから失敗を検知できるようにする。
    const emailResult = await sendConfirmationEmail(
      c.env,
      seminar,
      answers as ApplicationAnswers,
      applicantNameStr,
      applicantEmailStr,
    );
    if (emailResult.status !== "skipped") {
      await db
        .update(applications)
        .set({
          confirmationEmailStatus: emailResult.status,
          confirmationEmailError: emailResult.status === "failed" ? emailResult.error : null,
        })
        .where(eq(applications.id, row.id))
        .run();
    }

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

    return c.json(
      rows.map((r) => ({
        id: r.id,
        seminarSlug: r.seminarSlug,
        answers: JSON.parse(r.answersJson) as z.infer<typeof applicationAnswersSchema>,
        applicantName: r.applicantName,
        applicantEmail: r.applicantEmail,
        status: r.status,
        confirmationEmailStatus: r.confirmationEmailStatus,
        confirmationEmailError: r.confirmationEmailError,
        submittedAt: r.submittedAt,
      })),
      200,
    );
  });
}
