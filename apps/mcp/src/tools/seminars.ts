import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Bindings } from "../lib/bindings";
import { callApi } from "../lib/api-client";
import { apiResultToToolResult, jsonResult } from "../lib/tool-result";

// セミナー本体(core fields + sections)・状態遷移・申込フォーム定義・申込一覧の
// MCPツール。apps/apiの /v1/seminars* を1:1でラップする（実装計画5章）。
// zod v3/v4混在の事情はtools/news.tsのコメント参照。ここでの定義はツール入力
// 形状の説明であり、実際のバリデーションの正はapps/api側(zod v3)にある。
const seminarSectionsShape = {
  target: z.object({ title: z.string(), items: z.array(z.object({ text: z.string() })) }),
  benefits: z.object({
    items: z.array(z.object({ num: z.string(), title: z.string(), desc: z.string() })),
  }),
  timeline: z.object({
    items: z.array(
      z.object({
        time: z.string(),
        title: z.string(),
        desc: z.string().optional(),
        modifier: z.enum(["break", "end"]).optional(),
      }),
    ),
  }),
  voices: z.object({
    items: z.array(z.object({ text: z.string(), name: z.string(), job: z.string() })),
    note: z.string().optional(),
  }),
  speakers: z.object({
    items: z.array(
      z.object({
        photoKey: z.string().optional(),
        tags: z.array(z.string()),
        name: z.string(),
        kana: z.string(),
        affil: z.string(),
        desc: z.string(),
      }),
    ),
  }),
  overview: z.object({ rows: z.array(z.object({ label: z.string(), valueHtml: z.string() })) }),
  faq: z.object({ items: z.array(z.object({ question: z.string(), answer: z.string() })) }),
  cta: z.object({
    closing: z.string(),
    sub: z.string(),
    meta: z.string().optional(),
    btnLabel: z.string(),
  }),
};

const statusEnum = z.enum(["draft", "before_registration", "open", "closed"]);

const seminarCreateShape = {
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slugは英小文字・数字・ハイフンのみ使用できます"),
  status: statusEnum.optional(),
  detailPage: z.boolean().optional().describe("true=詳細ページあり(既定)、false=過去実績のカードのみ"),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式である必要があります"),
  eventDateDisplay: z.string().optional(),
  seminarType: z.string().min(1),
  title: z.string().min(1),
  catchLine: z.string().optional(),
  heroSub: z.string().optional(),
  description: z.string().min(1),
  priceDisplay: z.string().optional(),
  priceNote: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  seatsLeft: z.number().int().nonnegative().optional(),
  heroImageKey: z.string().optional(),
  cardImageKey: z.string().optional(),
  venueSummary: z.string().optional(),
  sections: z.object(seminarSectionsShape),
  metaDescription: z.string().min(1),
  metaKeywords: z.string().optional(),
};

const seminarUpdateShape = {
  status: seminarCreateShape.status,
  detailPage: seminarCreateShape.detailPage,
  eventDate: seminarCreateShape.eventDate.optional(),
  eventDateDisplay: seminarCreateShape.eventDateDisplay,
  seminarType: seminarCreateShape.seminarType.optional(),
  title: seminarCreateShape.title.optional(),
  catchLine: seminarCreateShape.catchLine,
  heroSub: seminarCreateShape.heroSub,
  description: seminarCreateShape.description.optional(),
  priceDisplay: seminarCreateShape.priceDisplay,
  priceNote: seminarCreateShape.priceNote,
  capacity: seminarCreateShape.capacity,
  seatsLeft: seminarCreateShape.seatsLeft,
  heroImageKey: seminarCreateShape.heroImageKey,
  cardImageKey: seminarCreateShape.cardImageKey,
  venueSummary: seminarCreateShape.venueSummary,
  sections: seminarCreateShape.sections.optional(),
  metaDescription: seminarCreateShape.metaDescription.optional(),
  metaKeywords: seminarCreateShape.metaKeywords,
};

const applyFormFieldShape = z.object({
  id: z.string().min(1),
  section: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "email", "tel", "textarea", "radio", "checkbox"]),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  otherOption: z.boolean().optional(),
});

export function registerSeminarTools(server: McpServer, env: Bindings, token: string) {
  server.registerTool(
    "seminar_list",
    {
      description: "セミナーの一覧を取得する（event_date降順）",
      inputSchema: {
        status: statusEnum.optional(),
        upcoming: z.boolean().optional().describe("true=開催予定のみ、false=過去開催のみ"),
        limit: z.number().int().positive().max(100).optional(),
        offset: z.number().int().nonnegative().optional(),
      },
    },
    async ({ status, upcoming, limit, offset }) => {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (upcoming !== undefined) qs.set("upcoming", String(upcoming));
      if (limit !== undefined) qs.set("limit", String(limit));
      if (offset !== undefined) qs.set("offset", String(offset));
      const query = qs.toString();
      return apiResultToToolResult(await callApi(env, token, "GET", `/v1/seminars${query ? `?${query}` : ""}`));
    },
  );

  server.registerTool(
    "seminar_get",
    { description: "セミナーを1件取得する（申込フォーム定義applyFormを含む）", inputSchema: { slug: z.string() } },
    async ({ slug }) => apiResultToToolResult(await callApi(env, token, "GET", `/v1/seminars/${slug}`)),
  );

  server.registerTool(
    "seminar_create",
    { description: "セミナーを新規作成する", inputSchema: seminarCreateShape },
    async (input) => apiResultToToolResult(await callApi(env, token, "POST", "/v1/seminars", input)),
  );

  server.registerTool(
    "seminar_update",
    {
      description: "セミナーの本体コンテンツを部分更新する（statusとapplyFormは対象外。専用ツールを使うこと）",
      inputSchema: { slug: z.string(), ...seminarUpdateShape },
    },
    async ({ slug, ...body }) =>
      apiResultToToolResult(await callApi(env, token, "PATCH", `/v1/seminars/${slug}`, body)),
  );

  server.registerTool(
    "seminar_update_status",
    {
      description:
        "セミナーの状態(status)のみを更新する。日付からの自動遷移は行わないため、募集開始・締切等は必ずこのツールで明示的に変更する",
      inputSchema: { slug: z.string(), status: statusEnum },
    },
    async ({ slug, status }) =>
      apiResultToToolResult(await callApi(env, token, "PATCH", `/v1/seminars/${slug}/status`, { status })),
  );

  server.registerTool(
    "seminar_update_apply_form",
    {
      description: "セミナーの申込フォーム定義（入力項目）を更新する",
      inputSchema: { slug: z.string(), fields: z.array(applyFormFieldShape).min(1) },
    },
    async ({ slug, ...body }) =>
      apiResultToToolResult(await callApi(env, token, "PATCH", `/v1/seminars/${slug}/apply-form`, body)),
  );

  server.registerTool(
    "seminar_applications_list",
    {
      description: "セミナーの申込一覧を取得する（各申込に紐づくメール送信結果を含む）",
      inputSchema: { slug: z.string() },
    },
    async ({ slug }) => apiResultToToolResult(await callApi(env, token, "GET", `/v1/seminars/${slug}/applications`)),
  );

  server.registerTool(
    "seminar_delete",
    {
      description:
        "セミナーを削除する（confirm=trueの指定が必須。申込またはメールテンプレートが存在する場合は削除できない）",
      inputSchema: { slug: z.string(), confirm: z.boolean() },
    },
    async ({ slug, confirm }) => {
      if (!confirm) return jsonResult({ error: "confirm=trueの指定が必要です" }, true);
      return apiResultToToolResult(await callApi(env, token, "DELETE", `/v1/seminars/${slug}?confirm=true`));
    },
  );
}
