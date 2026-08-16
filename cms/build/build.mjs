#!/usr/bin/env node
// DBのpublished news全件から、news/以下とindex.htmlの#newsセクションを再生成する。
// add-news Skill（.claude/skills/add-news/SKILL.md）が人手で行っている
// 「3箇所同期＋トップページ最新3件まで」というルールをそのままコードにしたもの。
//
// 実行にはCMS_API_URL（cms/workerの公開URL、ローカルDockerなら http://worker:8787）と
// CMS_API_TOKEN（Worker側のMCP_BEARER_TOKENと同じ値）が必要。
// 追加npm依存なし（Node組み込みのfetch/fsのみ使用）。
//
// Usage: node cms/build/build.mjs
// Docker: docker compose -f cms/docker-compose.yml run --rm build

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchPublishedNews } from "./lib/cms-api.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

// 詳細ページのテンプレートはadd-news Skillの資産をそのまま流用する
// （Skill経由の手動編集とCMS経由の自動生成が同じ出力に収束するようにするため）。
const DETAIL_TEMPLATE_PATH = path.join(REPO_ROOT, ".claude/skills/add-news/assets/detail-template.html");
const LIST_ITEM_TEMPLATE_PATH = path.join(__dirname, "templates/news-list-item.html");
const TOP_ITEM_TEMPLATE_PATH = path.join(__dirname, "templates/news-top-item.html");

const NEWS_INDEX_PATH = path.join(REPO_ROOT, "news/index.html");
const HOME_INDEX_PATH = path.join(REPO_ROOT, "index.html");

const LIST_MARKER_START = "<!-- CMS:NEWS:LIST:START -->";
const LIST_MARKER_END = "<!-- CMS:NEWS:LIST:END -->";
const TOP_MARKER_START = "<!-- CMS:NEWS:TOP:START -->";
const TOP_MARKER_END = "<!-- CMS:NEWS:TOP:END -->";

const EMPTY_PLACEHOLDER = '<li class="news-item news-empty">現在、お知らせはございません。</li>';
const TOP_PAGE_LIMIT = 3; // add-news Skillの運用ルール（トップページは最新3件まで）を踏襲

function render(template, vars) {
  return Object.entries(vars).reduce((html, [key, value]) => html.split(`{{${key}}}`).join(value ?? ""), template);
}

function toDisplayDate(isoDate) {
  // 'YYYY-MM-DD' -> 'YYYY.MM.DD'（既存ページの表記に合わせる）
  return isoDate.replaceAll("-", ".");
}

function replaceBetweenMarkers(html, startMarker, endMarker, content) {
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(
      `マーカーが見つかりません: ${startMarker} ... ${endMarker}（初回セットアップでindex.html/news/index.htmlにマーカーコメントを追加したか確認してください）`
    );
  }
  const before = html.slice(0, startIdx + startMarker.length);
  // endMarker行の行頭（インデント込み）を保持する。html.indexOf(endMarker)はインデントを
  // 含まないため、単純に html.slice(endIdx) すると次回ビルド時にendMarker行の字下げが
  // 失われて左端に寄ってしまう。
  const endLineStart = html.lastIndexOf("\n", endIdx) + 1;
  const endIndent = html.slice(endLineStart, endIdx);
  const after = html.slice(endIdx);

  // index.htmlはファイル全体がCRLFで保存されている（news/index.html等はLF）。
  // 差し込むcontentがLF固定だとファイル内で改行コードが混在してしまうので、
  // 差し込み先の既存の改行コードに合わせる。
  const usesCrlf = html.includes("\r\n");
  const normalizedContent = usesCrlf ? content.replace(/\r?\n/g, "\r\n") : content;
  const newline = usesCrlf ? "\r\n" : "\n";

  return `${before}${newline}${normalizedContent}${newline}${endIndent}${after}`;
}

async function main() {
  const rows = await fetchPublishedNews();

  const [detailTemplate, listItemTemplateRaw, topItemTemplateRaw] = await Promise.all([
    readFile(DETAIL_TEMPLATE_PATH, "utf8"),
    readFile(LIST_ITEM_TEMPLATE_PATH, "utf8"),
    readFile(TOP_ITEM_TEMPLATE_PATH, "utf8"),
  ]);
  // フラグメントテンプレートは末尾改行込みでファイル保存されているため、そのまま.join("\n")すると
  // 複数件の間に空行が増殖する。末尾の空白だけ落として1件ずつを綺麗に連結できるようにする。
  const listItemTemplate = listItemTemplateRaw.trimEnd();
  const topItemTemplate = topItemTemplateRaw.trimEnd();

  // 1. 詳細ページ (news/<slug>/index.html) を全件再生成
  for (const row of rows) {
    const detailHtml = render(detailTemplate, {
      TITLE: row.title,
      DESCRIPTION: row.description || row.list_desc,
      KEYWORDS: row.keywords || "",
      SLUG: row.slug,
      TAG: row.category,
      DATE_DISPLAY: toDisplayDate(row.published_at),
      BODY: row.body_html,
    });
    const dir = path.join(REPO_ROOT, "news", row.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), detailHtml, "utf8");
    console.log(`wrote news/${row.slug}/index.html`);
  }

  // 2. /news/ 一覧ページ（全件、概要文あり、新しい順）
  const listItemsHtml = rows.length
    ? rows
        .map((row) =>
          render(listItemTemplate, {
            SLUG: row.slug,
            DATE_DISPLAY: toDisplayDate(row.published_at),
            TAG: row.category,
            TITLE: row.title,
            LIST_DESC: row.list_desc,
          })
        )
        .join("\n")
    : EMPTY_PLACEHOLDER;

  const newsIndexHtml = await readFile(NEWS_INDEX_PATH, "utf8");
  await writeFile(
    NEWS_INDEX_PATH,
    replaceBetweenMarkers(newsIndexHtml, LIST_MARKER_START, LIST_MARKER_END, listItemsHtml),
    "utf8"
  );
  console.log("updated news/index.html");

  // 3. トップページ #news セクション（show_on_top=1のうち最新3件、概要文なし）
  const topRows = rows.filter((row) => Number(row.show_on_top) === 1).slice(0, TOP_PAGE_LIMIT);
  const topItemsHtml = topRows.length
    ? topRows
        .map((row) =>
          render(topItemTemplate, {
            SLUG: row.slug,
            DATE_DISPLAY: toDisplayDate(row.published_at),
            TAG: row.category,
            TITLE: row.title,
          })
        )
        .join("\n")
    : EMPTY_PLACEHOLDER;

  const homeHtml = await readFile(HOME_INDEX_PATH, "utf8");
  await writeFile(HOME_INDEX_PATH, replaceBetweenMarkers(homeHtml, TOP_MARKER_START, TOP_MARKER_END, topItemsHtml), "utf8");
  console.log("updated index.html (#news)");

  console.log(`done. published news: ${rows.length}件 (top page: ${topRows.length}件)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
