import type { FC } from "hono/jsx";
import type { NewsRow, ProductRow, ServiceRow } from "@bitcraft/db";

// href未設定（NULL/"#"）の項目は「準備中です」のプレースホルダー扱いにする
// （移行前の静的マークアップの挙動を踏襲。実装計画3章）。
function isPlaceholderHref(href: string | null): boolean {
  return !href || href === "#";
}

function linkTitleFor(item: { href: string | null; linkTitle: string | null; title: string }): string {
  if (item.linkTitle) return item.linkTitle;
  return isPlaceholderHref(item.href) ? "準備中です。" : item.title;
}

// トップページの#news・#service・#idea(表示名はProduct)はD1駆動で描画する
// （News/Service/Productとも実装計画3章）。About/Contactは既存コンテンツを
// そのまま踏襲した静的セクション。
export const TopPage: FC<{ latestNews: NewsRow[]; services: ServiceRow[]; products: ProductRow[] }> = ({
  latestNews,
  services,
  products,
}) => {
  return (
    <>
      <div class="loading">
        <img class="loading__logo" src="/image/bitcraft-logo-full.png" alt="bitcraft" />
      </div>
      <main>
        <div class="c-text js-tick">
          <div class="c-text__item">0110101101101011</div>
          <div class="c-text__item">0110101101101011</div>
        </div>
        <div class="c-text js-tick">
          <div class="c-text__item2">0110101101101011</div>
          <div class="c-text__item2">0110101101101011</div>
        </div>
        <div class="c-text js-tick">
          <div class="c-text__item">0110101101101011</div>
          <div class="c-text__item">0110101101101011</div>
        </div>
        <div class="home">
          <p class="title-disc">My Mission</p>
          <h1 class="main-titile fadeIn1500ms">
            ITソリューションで、<br />
            n=1 から
            <br />
            幸せにする。
          </h1>
          <p class="discription fadeIn1500ms">
            bitcraftは「n=1から幸せにする」をミッションに掲げています。最初から広く汎用性を求めると、誰の幸せにもつながらないことがあります。だからこそ、一人の心からの幸せを大切にし、それが多くの人に愛されるサービスへと広がると信じています。
            技術はあくまで手段。お客様の課題を言語化し、最適な技術を選び、開発まで一貫して寄り添いながら、価値あるサービスを提供します。
          </p>
        </div>

        {/* Service */}
        <div class="service" id="service">
          <div class="content">
            <p class="number-white">001</p>
            <div class="section-title">
              <h2>Service</h2>
              <p>要件定義から設計・開発・運用まで、ITソリューションを一貫して提供します。</p>
            </div>
            <ul class="service-list">
              {services.map((item) => (
                <li class="list-item">
                  <a href={item.href ?? "#"} title={linkTitleFor(item)} class="list-item-link">
                    <div class="service-image">
                      <img src={item.imageUrl ?? ""} alt="イメージ" />
                    </div>
                    <div class="title">
                      <h3>{item.title}</h3>
                      <i class="fa-solid fa-circle-chevron-right"></i>
                    </div>
                    <p>{item.description}</p>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Product（旧Idea。id/クラス名はstyle.cssのセレクタと合わせるためidea/idea-*のまま） */}
        <div class="idea" id="idea">
          <div class="content">
            <p class="number-white">010</p>
            <div class="section-title">
              <h2>Product</h2>
              <p>思いついた事業アイデアをここにメモしておきます。皆さんと一緒に形に出来たら嬉しいです。</p>
            </div>
            <ul class="idea-list">
              {products.map((item) => (
                <li class="idea-item">
                  <div class="idea-image">
                    <img src={item.imageUrl ?? ""} alt="イメージ" />
                  </div>
                  <div class="idea-disc">
                    <p class="sub-title">{item.subTitle}</p>
                    <a class="title" href={item.href ?? "#"} title={linkTitleFor(item)}>
                      <h3>{item.title}</h3>
                      <i class="fa-solid fa-circle-chevron-right"></i>
                    </a>
                    <p>{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* News（D1駆動、最新3件） */}
        <div class="news" id="news">
          <div class="content">
            <p class="number-white">011</p>
            <div class="section-title">
              <h2>News</h2>
              <p>bitcraftからのお知らせや最新情報をお届けします。</p>
            </div>
            <ul class="news-list">
              {latestNews.map((item) => (
                <li class="news-item">
                  <a class="news-item-link" href={`/news/${item.slug}/`}>
                    <span class="news-date">{item.date.replaceAll("-", ".")}</span>
                    <span class="news-tag">{item.tag}</span>
                    <span class="news-item-title">{item.title}</span>
                    <i class="fa-solid fa-chevron-right"></i>
                  </a>
                </li>
              ))}
            </ul>
            <p class="news-more">
              <a href="/news/">
                お知らせ一覧を見る <i class="fa-solid fa-circle-chevron-right"></i>
              </a>
            </p>
          </div>
        </div>

        {/* About */}
        <div class="about" id="about">
          <div class="content">
            <p class="number-black">100</p>
            <div class="section-title">
              <h2>About</h2>
              <p>私のプロフィールを簡単に紹介します。</p>
            </div>
            <div class="profile">
              <div class="profile-image">
                <img src="/image/about-img2.png" alt="イメージ" />
              </div>
              <div class="profile-disc">
                <p>Ando Tasiuke</p>
                <h3>安藤 太亮</h3>
                <p>
                  12歳でプログラミングを学び始め、アルゴリズムやシステム開発に興味を持つ。15歳で競技プログラミングに没頭し、論理的思考や問題解決力を鍛える。16歳で地域課題に取り組むプロジェクトの代表を務め、動画編集やデザインを学びながら、チームでの企画運営を経験。18歳で友人と起業し、システム開発、プログラミング講師、事業責任者を務める。実践を通じて技術力だけでなく、経営やサービス設計の視点も磨く。20歳で個人事業「bitcraft」を開業。システム開発、デザイン、教育を軸に、企業や地域の課題を発見し、最適なソリューションを提供。業界を問わず、多様なニーズに対応し、新たな価値を生み出すことを目指している。
                </p>
                <ul class="social">
                  <li>
                    <a class="social-item" href="https://www.instagram.com/ta.__.ch/" target="_blank">
                      <i class="fa-brands fa-instagram"></i>
                      <p>Instagram</p>
                    </a>
                  </li>
                  <li>
                    <a
                      class="social-item"
                      href="https://www.facebook.com/profile.php?id=100053394909552"
                      target="_blank"
                    >
                      <i class="fa-brands fa-square-facebook"></i>
                      <p>Facebook</p>
                    </a>
                  </li>
                  <li>
                    <a class="social-item" href="https://x.com/kuma_progr" target="_blank">
                      <i class="fa-brands fa-square-x-twitter"></i>
                      <p>X (旧Twitter)</p>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div class="contact" id="contact">
          <div class="content content2">
            <div class="left-item">
              <p class="number-white">101</p>
              <div class="section-title">
                <h2>Contact</h2>
                <p>ご相談やお見積もりなど、お気軽にお問い合わせください。</p>
              </div>
            </div>
            <div class="right-item">
              <a class="contact-button white" href="mailto:ando1202taisuke@gmail.com">
                メールを送る
              </a>
              <a class="contact-button black" href="/contact/" alt="お問い合わせフォーム">
                お問い合わせ
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};
