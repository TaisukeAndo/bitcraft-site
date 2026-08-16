import { z } from "zod";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * news/<slug>/ の本文で許可するタグ。add-news Skill (news/news-detail-style.css) が
 * 前提にしている構造（h2見出し・p段落・ul/li箇条書き・a内部リンク）に合わせている。
 * 完全なHTMLサニタイザではなく簡易的なタグ許可リストチェックなので、
 * 属性値の中身（href以外）までは検証していない点に注意。
 */
const ALLOWED_TAGS = new Set(["h2", "p", "ul", "li", "br", "a", "strong", "em"]);

export function assertAllowedHtml(html: string): void {
  const tagRe = /<\/?([a-zA-Z0-9]+)(\s[^>]*)?>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html))) {
    const tag = match[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      throw new Error(
        `body_htmlに許可されていないタグが含まれています: <${tag}>。使えるタグ: ${[...ALLOWED_TAGS].join(", ")}`
      );
    }
  }
}

export const NewsCreateSchema = z.object({
  slug: z
    .string()
    .regex(SLUG_RE, "slugは英小文字・数字・ハイフンのkebab-caseで指定してください（例: ai-agent-1day-open）"),
  title: z.string().min(1).describe("一覧の見出し・詳細ページのh1に使う短い文"),
  category: z
    .string()
    .min(1)
    .describe("一覧に出すタグ文言。迷ったら セミナー / サービス / お知らせ / メディア のいずれか"),
  published_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で指定してください"),
  list_desc: z.string().min(1).describe("/news/ 一覧にだけ表示される概要文（1〜2文、トップページには出さない）"),
  body_html: z
    .string()
    .min(1)
    .describe(
      "詳細ページ本文。使えるタグは h2, p, ul, li, br, a, strong, em のみ。内部リンクは /service/seminar/... のようにサイトルートからのroot-relativeパスで書く"
    ),
  keywords: z.string().optional().default(""),
  description: z.string().optional().describe("meta description。省略時はlist_descを流用する"),
  show_on_top: z.boolean().optional().default(true).describe("falseにするとトップページの最新3件からは除外（一覧には残る）"),
});
export type NewsCreateInput = z.infer<typeof NewsCreateSchema>;

export const NewsUpdateSchema = z.object({
  slug: z.string().describe("更新対象の既存記事slug"),
  title: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  published_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  list_desc: z.string().min(1).optional(),
  body_html: z.string().min(1).optional(),
  keywords: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
  show_on_top: z.boolean().optional(),
});
export type NewsUpdateInput = z.infer<typeof NewsUpdateSchema>;
