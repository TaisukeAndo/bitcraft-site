import type { FC } from "hono/jsx";
import type { SeminarRow } from "@bitcraft/db";
import { SeminarCard } from "./seminar-card";

export const SeminarListPage: FC<{ upcoming: SeminarRow[]; past: SeminarRow[] }> = ({ upcoming, past }) => {
  return (
    <main>
      <div class="top">
        <div class="title-image">
          <img src="/service/seminar/img/top-img.jpg" alt="Seminar" />
        </div>
        <div class="title">
          <h1>セミナー・ワークショップ</h1>
          <p>実践的なスキルを身につける、bitcraftのセミナー・ワークショップ。</p>
        </div>
      </div>

      <div class="seminar-list-section">
        <div class="content">
          <div class="seminar-list-header">
            <h2 class="seminar-list-title">開催予定のセミナー</h2>
          </div>
          <ul class="seminar-card-list">
            {upcoming.map((s) => (
              <SeminarCard seminar={s} isPast={false} />
            ))}
          </ul>
        </div>
      </div>

      <div class="seminar-list-section seminar-list-section--past">
        <div class="content">
          <div class="seminar-list-header">
            <h2 class="seminar-list-title">過去に開催したセミナー</h2>
          </div>
          <ul class="seminar-card-list">
            {past.map((s) => (
              <SeminarCard seminar={s} isPast={true} />
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
};
