import type { FC } from "hono/jsx";
import type { NewsRow } from "@bitcraft/db";

export const NewsListPage: FC<{ items: NewsRow[] }> = ({ items }) => {
  return (
    <main>
      <div class="top top--news">
        <div class="title-image">
          <img src="/news/img/top-image.jpg" alt="News" />
        </div>
        <div class="title">
          <h1>News</h1>
          <p>bitcraftからのお知らせや最新情報をお届けします。</p>
        </div>
      </div>

      <div class="news-list-section">
        <div class="content">
          <h2 class="news-list-title">お知らせ一覧</h2>
          <ul class="news-list">
            {items.map((item) => (
              <li class="news-item">
                <a class="news-item-link" href={`/news/${item.slug}/`}>
                  <div class="news-item-main">
                    <div class="news-item-meta">
                      <span class="news-date">{item.date.replaceAll("-", ".")}</span>
                      <span class="news-tag">{item.tag}</span>
                    </div>
                    <span class="news-item-title">{item.title}</span>
                    {item.summary ? <p class="news-item-desc">{item.summary}</p> : null}
                  </div>
                  <i class="fa-solid fa-chevron-right"></i>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
};
