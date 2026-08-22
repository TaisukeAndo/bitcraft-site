import type { FC } from "hono/jsx";
import type { SeminarRow } from "@bitcraft/db";
import type { SeminarSections } from "@bitcraft/shared";
import { mediaUrl } from "../../lib/media-url";

export const SeminarDetailPage: FC<{
  seminar: SeminarRow;
  sections: SeminarSections;
  registrationClosed: boolean;
}> = ({ seminar, sections, registrationClosed }) => {
  const applyHref = registrationClosed ? undefined : `/service/seminar/${seminar.slug}/apply/`;
  const heroImage = mediaUrl(seminar.heroImageKey);

  return (
    <main>
      {/* ===== HERO ===== */}
      <section class="sd-hero">
        {/* seminar-detail-style.css の `.sd-hero__bg` は旧サイトの相対パス
            (./img/hero-bg.png) を背景画像に指定しているが、画像本体はR2へ
            移設したため参照先が存在しない。heroImageKeyをインラインstyleで
            注入し、外部CSSの同一プロパティより優先させて上書きする。 */}
        <div class="sd-hero__bg" style={heroImage ? { backgroundImage: `url('${heroImage}')` } : undefined}>
          <div class="sd-hero__noise"></div>
        </div>
        <div class="sd-hero__inner content">
          <div class="sd-hero__breadcrumb">
            <a href="/">Home</a>
            <span>/</span>
            <a href="/service/seminar/">Seminar</a>
            <span>/</span>
            <span dangerouslySetInnerHTML={{ __html: seminar.title.replace(/<br>/g, " ") }} />
          </div>
          <div class="sd-hero__badge">{seminar.eventDateDisplay ?? seminar.eventDate}開催</div>
          <h1 class="sd-hero__catch" dangerouslySetInnerHTML={{ __html: seminar.catchLine ?? seminar.title }} />
          {seminar.heroSub ? (
            <p class="sd-hero__sub" dangerouslySetInnerHTML={{ __html: seminar.heroSub }} />
          ) : null}
          <div class="sd-hero__cta-wrap">
            {registrationClosed ? (
              <span class="sd-hero__cta sd-hero__cta--closed">募集は終了しました</span>
            ) : (
              <a class="sd-hero__cta" href={applyHref}>
                今すぐ申し込む
                <i class="fa-solid fa-arrow-right"></i>
              </a>
            )}
            <div class="sd-hero__meta">
              {seminar.priceDisplay ? (
                <span>
                  <i class="fa-solid fa-yen-sign"></i> {seminar.priceDisplay.replace("¥", "")}円 {seminar.priceNote}
                </span>
              ) : null}
              {seminar.capacity ? (
                <span>
                  <i class="fa-solid fa-users"></i> 定員{seminar.capacity}名{" "}
                  {!registrationClosed ? <span class="seminar-registration-badge">受付中</span> : null}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ===== TARGET ===== */}
      {sections.target.items.length > 0 ? (
        <section class="sd-section sd-target">
          <div class="content">
            <div class="sd-section__head">
              <p class="sd-section__label">TARGET</p>
              <h2 class="sd-section__title">{sections.target.title || "こんな方に届けたい"}</h2>
            </div>
            <ul class="sd-target__list">
              {sections.target.items.map((item) => (
                <li class="sd-target__item">
                  <span class="sd-target__icon">
                    <i class="fa-solid fa-check"></i>
                  </span>
                  <p dangerouslySetInnerHTML={{ __html: item.text }} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ===== BENEFITS ===== */}
      {sections.benefits.items.length > 0 ? (
        <section class="sd-section sd-benefits">
          <div class="content">
            <div class="sd-section__head">
              <p class="sd-section__label">BENEFITS</p>
              <h2 class="sd-section__title">セミナーで得られること</h2>
            </div>
            <div class="sd-benefits__grid">
              {sections.benefits.items.map((item) => (
                <div class="sd-benefit-card">
                  <div class="sd-benefit-card__num">{item.num}</div>
                  <h3 class="sd-benefit-card__title">{item.title}</h3>
                  <p class="sd-benefit-card__desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== TIMELINE ===== */}
      {sections.timeline.items.length > 0 ? (
        <section class="sd-section sd-timeline">
          <div class="content">
            <div class="sd-section__head">
              <p class="sd-section__label">PROGRAM</p>
              <h2 class="sd-section__title">当日のプログラム</h2>
            </div>
            <div class="sd-timeline__list">
              {sections.timeline.items.map((item) => (
                <div class={`sd-timeline__item${item.modifier ? ` sd-timeline__item--${item.modifier}` : ""}`}>
                  <div class="sd-timeline__time">{item.time}</div>
                  <div class="sd-timeline__dot"></div>
                  <div class="sd-timeline__content">
                    <h3>{item.title}</h3>
                    {item.desc ? <p dangerouslySetInnerHTML={{ __html: item.desc }} /> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== VOICES ===== */}
      {sections.voices.items.length > 0 ? (
        <section class="sd-section sd-voices">
          <div class="content">
            <div class="sd-section__head">
              <p class="sd-section__label">VOICES</p>
              <h2 class="sd-section__title">参加者の声</h2>
            </div>
            <div class="sd-voices__grid">
              {sections.voices.items.map((item) => (
                <blockquote class="sd-voice-card">
                  <p class="sd-voice-card__text">{item.text}</p>
                  {item.name ? (
                    <div class="sd-voice-card__author">
                      <i class="fa-solid fa-circle-user sd-voice-card__icon"></i>
                      <div class="sd-voice-card__author-info">
                        <span class="sd-voice-card__name">{item.name}</span>
                        <span class="sd-voice-card__job">{item.job}</span>
                      </div>
                    </div>
                  ) : null}
                </blockquote>
              ))}
            </div>
            {sections.voices.note ? <p class="sd-voices__note">{sections.voices.note}</p> : null}
          </div>
        </section>
      ) : null}

      {/* ===== SPEAKERS ===== */}
      {sections.speakers.items.length > 0 ? (
        <section class="sd-section sd-speakers">
          <div class="content">
            <div class="sd-section__head">
              <p class="sd-section__label">SPEAKERS</p>
              <h2 class="sd-section__title">講師紹介</h2>
            </div>
            <div class="sd-speakers__grid">
              {sections.speakers.items.map((sp) => (
                <div class="sd-speaker-card">
                  <div class="sd-speaker-card__photo-wrap">
                    {mediaUrl(sp.photoKey) ? (
                      <img
                        src={mediaUrl(sp.photoKey) ?? undefined}
                        alt={sp.name}
                        class="sd-speaker-card__photo"
                      />
                    ) : (
                      <div class="sd-speaker-card__photo-placeholder">
                        <i class="fa-solid fa-circle-user"></i>
                      </div>
                    )}
                  </div>
                  <div class="sd-speaker-card__body">
                    <div class="sd-speaker-card__tags">
                      {sp.tags.map((tag, i) => (
                        <span class={`sd-speaker-card__tag${i === 1 ? " sd-speaker-card__tag--blue" : ""}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 class="sd-speaker-card__name">
                      {sp.name}
                      <span class="sd-speaker-card__kana">{sp.kana}</span>
                    </h3>
                    <p class="sd-speaker-card__affil">{sp.affil}</p>
                    <p class="sd-speaker-card__desc">{sp.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== OVERVIEW ===== */}
      {sections.overview.rows.length > 0 ? (
        <section class="sd-section sd-overview">
          <div class="content">
            <div class="sd-section__head">
              <p class="sd-section__label">OVERVIEW</p>
              <h2 class="sd-section__title">開催概要</h2>
            </div>
            <table class="sd-overview__table">
              <tbody>
                {sections.overview.rows.map((row) => (
                  <tr>
                    <th>{row.label}</th>
                    <td dangerouslySetInnerHTML={{ __html: row.valueHtml }} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* ===== FAQ ===== */}
      {sections.faq.items.length > 0 ? (
        <section class="sd-section sd-faq">
          <div class="content">
            <div class="sd-section__head">
              <p class="sd-section__label">FAQ</p>
              <h2 class="sd-section__title">よくある質問</h2>
            </div>
            <div class="sd-faq__list">
              {sections.faq.items.map((item) => (
                <div class="sd-faq__item">
                  <div class="sd-faq__q">
                    <span class="sd-faq__q-label">Q</span>
                    <p>{item.question}</p>
                  </div>
                  <div class="sd-faq__a">
                    <span class="sd-faq__a-label">A</span>
                    <p dangerouslySetInnerHTML={{ __html: item.answer }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== CTA ===== */}
      {sections.cta.closing ? (
        <section class="sd-cta" id="apply">
          <div class="sd-hero__bg" style={heroImage ? { backgroundImage: `url('${heroImage}')` } : undefined}></div>
          <div class="sd-hero__noise"></div>
          <div class="content">
            <p class="sd-cta__closing" dangerouslySetInnerHTML={{ __html: sections.cta.closing }} />
            <p class="sd-cta__sub">{sections.cta.sub}</p>
            {sections.cta.meta ? (
              <div
                class="sd-cta__meta"
                style="margin-bottom: 24px; color: #fff; text-align: center; font-size: 16px; line-height: 1.8;"
                dangerouslySetInnerHTML={{ __html: sections.cta.meta }}
              />
            ) : null}
            {registrationClosed ? (
              <span class="sd-cta__btn sd-cta__btn--closed">募集は終了しました</span>
            ) : (
              <a class="sd-cta__btn" href={applyHref}>
                {sections.cta.btnLabel || "参加申込はこちら"}
                <i class="fa-solid fa-arrow-right"></i>
              </a>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
};
