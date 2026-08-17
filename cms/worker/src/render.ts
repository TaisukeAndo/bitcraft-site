// news関連ページのHTMLをリクエスト毎に組み立てる（動的SSR）。
// テンプレート文字列はwrangler.tomlの `[[rules]]` (type = "Text") でバンドル時に
// 生の文字列としてインポートされる。デザインは既存の手書きHTMLをそのまま
// テンプレート化したもの（`.claude/skills/add-news/assets/detail-template.html` の複製が
// news-detail.html。Workerのビルド境界の都合上コピーになっており、手動編集時にSkill側の
// テンプレートを変えたらこちらにも反映すること。cms/README.md参照）。
import newsListPageTemplate from "../templates/news-list-page.html";
import newsListItemTemplateRaw from "../templates/news-list-item.html";
import newsTopItemTemplateRaw from "../templates/news-top-item.html";
import newsDetailTemplate from "../templates/news-detail.html";

const newsListItemTemplate = newsListItemTemplateRaw.trimEnd();
const newsTopItemTemplate = newsTopItemTemplateRaw.trimEnd();

const EMPTY_PLACEHOLDER = '<li class="news-item news-empty">現在、お知らせはございません。</li>';
export const TOP_PAGE_LIMIT = 3; // add-news Skillの運用ルール（トップページは最新3件まで）を踏襲

export type NewsRow = Record<string, any>;

function render(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((html, [key, value]) => html.split(`{{${key}}}`).join(value ?? ""), template);
}

export function toDisplayDate(isoDate: string): string {
  // 'YYYY-MM-DD' -> 'YYYY.MM.DD'（既存ページの表記に合わせる）
  return isoDate.replaceAll("-", ".");
}

export function renderNewsListItem(row: NewsRow): string {
  return render(newsListItemTemplate, {
    SLUG: row.slug,
    DATE_DISPLAY: toDisplayDate(row.published_at),
    TAG: row.category,
    TITLE: row.title,
    LIST_DESC: row.list_desc,
  });
}

export function renderNewsTopItem(row: NewsRow): string {
  return render(newsTopItemTemplate, {
    SLUG: row.slug,
    DATE_DISPLAY: toDisplayDate(row.published_at),
    TAG: row.category,
    TITLE: row.title,
  });
}

export function renderNewsListPage(rows: NewsRow[]): string {
  const itemsHtml = rows.length ? rows.map(renderNewsListItem).join("\n") : EMPTY_PLACEHOLDER;
  return render(newsListPageTemplate, { LIST_ITEMS: itemsHtml });
}

export function renderNewsDetailPage(row: NewsRow): string {
  return render(newsDetailTemplate, {
    TITLE: row.title,
    DESCRIPTION: row.description || row.list_desc,
    KEYWORDS: row.keywords || "",
    SLUG: row.slug,
    TAG: row.category,
    DATE_DISPLAY: toDisplayDate(row.published_at),
    BODY: row.body_html,
  });
}

export function selectTopRows(rows: NewsRow[]): NewsRow[] {
  return rows.filter((row) => Number(row.show_on_top) === 1).slice(0, TOP_PAGE_LIMIT);
}

/**
 * index.htmlの `<!-- CMS:NEWS:TOP:START -->` 〜 `<!-- CMS:NEWS:TOP:END -->` の間だけを
 * 最新記事で置き換える。旧cms/build/build.mjs（静的ファイル書き込み版）で実機検証済みだった
 * ロジック（インデント保持・改行コード保持）を、レスポンス生成用にそのまま移植したもの。
 */
export function patchHomepageNews(html: string, topRows: NewsRow[]): string {
  const startMarker = "<!-- CMS:NEWS:TOP:START -->";
  const endMarker = "<!-- CMS:NEWS:TOP:END -->";

  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    // マーカーが見つからない場合は、壊れた表示を返すより現状のHTMLをそのまま返す方が安全。
    return html;
  }

  const content = topRows.length ? topRows.map(renderNewsTopItem).join("\n") : EMPTY_PLACEHOLDER;

  const before = html.slice(0, startIdx + startMarker.length);
  const endLineStart = html.lastIndexOf("\n", endIdx) + 1;
  const endIndent = html.slice(endLineStart, endIdx);
  const after = html.slice(endIdx);

  // index.htmlはファイル全体がCRLFで保存されている場合があるため、差し込み先の
  // 既存の改行コードに合わせる（news/index.html等はLF）。
  const usesCrlf = html.includes("\r\n");
  const normalizedContent = usesCrlf ? content.replace(/\r?\n/g, "\r\n") : content;
  const newline = usesCrlf ? "\r\n" : "\n";

  return `${before}${newline}${normalizedContent}${newline}${endIndent}${after}`;
}
