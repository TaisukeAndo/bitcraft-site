import type { FC } from "hono/jsx";

export const NewsDetailPage: FC<{ title: string; date: string; tag: string; bodyHtml: string }> = ({
  title,
  date,
  tag,
  bodyHtml,
}) => {
  return (
    <main>
      <div class="top top--news">
        <div class="title-image">
          <img src="/news/img/top-image.jpg" alt="News" />
        </div>
        <div class="title">
          <h1>{title}</h1>
        </div>
      </div>

      <div class="detail">
        <div class="content">
          <div class="article-meta">
            <span class="news-date">{date}</span>
            <span class="news-tag">{tag}</span>
          </div>

          <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />

          <a class="back-link" href="/news/">
            <i class="fa-solid fa-chevron-right"></i> お知らせ一覧へ戻る
          </a>
        </div>
      </div>
    </main>
  );
};
