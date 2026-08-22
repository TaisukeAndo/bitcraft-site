import type { FC } from "hono/jsx";
import type { SeminarRow } from "@bitcraft/db";
import { mediaUrl } from "../../lib/media-url";

// 開催予定/過去開催どちらのセクションでも同一のカード構造を使う
// （既存の.seminar-card / .seminar-card--pastのHTML構造を踏襲）。
export const SeminarCard: FC<{ seminar: SeminarRow; isPast: boolean }> = ({ seminar, isPast }) => {
  const image = mediaUrl(seminar.cardImageKey);
  // 過去開催セクションのバッジは status の値によらず常に「終了」を描画で強制する
  // （実装計画 2章: statusは運用者の意図の記録として保持し、書き換えない）。
  const badgeLabel = isPast ? "終了" : seminar.status === "before_registration" ? "募集開始前" : "受付中";
  const cardBody = (
    <>
      <div class={`seminar-card-badge${isPast ? " seminar-card-badge--past" : ""}`}>{badgeLabel}</div>
      {image ? (
        <div class="seminar-card-image">
          <img src={image} alt={seminar.title.replace(/<br>/g, "")} />
        </div>
      ) : null}
      <div class="seminar-card-body">
        <div class="seminar-card-meta">
          <span class="seminar-card-date">
            <i class="fa-regular fa-calendar"></i> {seminar.eventDateDisplay ?? seminar.eventDate}
          </span>
          <span class="seminar-card-type">{seminar.seminarType}</span>
        </div>
        <h3 class="seminar-card-title" dangerouslySetInnerHTML={{ __html: seminar.title }} />
        <p class="seminar-card-desc">{seminar.description}</p>
        <div class="seminar-card-info">
          {seminar.priceDisplay ? (
            <span class="seminar-card-price">
              {seminar.priceDisplay} <small>{seminar.priceNote}</small>
            </span>
          ) : null}
          {seminar.capacity ? (
            <span class="seminar-card-seats">
              定員 {seminar.capacity}名{" "}
              {!isPast ? <span class="seminar-registration-badge">{badgeLabel}</span> : null}
            </span>
          ) : null}
        </div>
        {seminar.detailPage ? (
          <div class="seminar-card-cta">
            詳細を見る <i class="fa-solid fa-circle-chevron-right"></i>
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <li class={`seminar-card${isPast ? " seminar-card--past" : ""}`}>
      {seminar.detailPage ? (
        <a href={`/service/seminar/${seminar.slug}/`} class="seminar-card-link">
          {cardBody}
        </a>
      ) : (
        <a class="seminar-card-link">{cardBody}</a>
      )}
    </li>
  );
};
