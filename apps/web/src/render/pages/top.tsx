import type { FC } from "hono/jsx";
import type { NewsRow } from "@bitcraft/db";

// トップページの#news部分はD1の最新3件で描画するが、Service/Idea/About/Contact
// は既存コンテンツをそのまま踏襲した静的セクション（実装計画3章）。
export const TopPage: FC<{ latestNews: NewsRow[] }> = ({ latestNews }) => {
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
              <li class="list-item">
                <a href="#" title="準備中です。" class="list-item-link">
                  <div class="service-image">
                    <img src="/image/service-design-img.png" alt="イメージ" />
                  </div>
                  <div class="title">
                    <h3>UI / UX デザイン</h3>
                    <i class="fa-solid fa-circle-chevron-right"></i>
                  </div>
                  <p>
                    ユーザー視点を重視し、使いやすく魅力的なデザインを提供。優れた操作性を実現し、Web・アプリの価値を高めます。ユーザビリティ調査から設計まで一貫して対応します。
                  </p>
                </a>
              </li>
              <li class="list-item">
                <a href="#" title="準備中です。" class="list-item-link">
                  <div class="service-image">
                    <img src="/image/service-web-img.png" alt="イメージ" />
                  </div>
                  <div class="title">
                    <h3>Webサイト制作</h3>
                    <i class="fa-solid fa-circle-chevron-right"></i>
                  </div>
                  <p>
                    企業や個人の目的に合わせたWebサイトを設計・構築。デザイン性と機能性を両立し、SEOやモバイル対応も考慮。要件定義から運用サポートまで幅広く対応します。
                  </p>
                </a>
              </li>
              <li class="list-item">
                <a href="#" title="準備中です。" class="list-item-link">
                  <div class="service-image">
                    <img src="/image/service-system-img.png" alt="イメージ" />
                  </div>
                  <div class="title">
                    <h3>システム開発</h3>
                    <i class="fa-solid fa-circle-chevron-right"></i>
                  </div>
                  <p>
                    業務効率化や新規サービスの実現に向け、最適なシステムを開発。Webアプリや業務システム、API連携など、要件に応じた柔軟な設計・実装を行います。
                  </p>
                </a>
              </li>
              <li class="list-item">
                <a href="#" title="準備中です。" class="list-item-link">
                  <div class="service-image">
                    <img src="/image/service-3dcg-img.png" alt="イメージ" />
                  </div>
                  <div class="title">
                    <h3>映像・3DCG</h3>
                    <i class="fa-solid fa-circle-chevron-right"></i>
                  </div>
                  <p>
                    キャラクターモデリングやプロダクトデザインなど、高品質な3DCGを制作。ゲームや映像、VR/ARなど幅広い分野に対応し、視覚的に魅力あるコンテンツを提供します。
                  </p>
                </a>
              </li>
              <li class="list-item">
                <a href="/service/seminar/" title="セミナー・ワークショップ" class="list-item-link">
                  <div class="service-image">
                    <img src="/image/service-education-img.jpg" alt="イメージ" />
                  </div>
                  <div class="title">
                    <h3>セミナー・ワークショップ</h3>
                    <i class="fa-solid fa-circle-chevron-right"></i>
                  </div>
                  <p>
                    プログラミングやデザインなど、専門スキルを指導。初心者から実務レベルまで対応し、学習者の目標に合わせたカリキュラムを提供します。企業研修や個別指導も可能です。
                  </p>
                </a>
              </li>
              <li class="list-item">
                <a href="#" title="準備中です。" class="list-item-link">
                  <div class="service-image">
                    <img src="/image/service-pm-img.png" alt="イメージ" />
                  </div>
                  <div class="title">
                    <h3>マネージャー業務</h3>
                    <i class="fa-solid fa-circle-chevron-right"></i>
                  </div>
                  <p>
                    開発プロジェクトの進行管理や品質管理を担当。要件定義からスケジュール調整、チームビルディングまで、円滑なプロジェクト運営をサポートします。
                  </p>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Idea */}
        <div class="idea" id="idea">
          <div class="content">
            <p class="number-white">010</p>
            <div class="section-title">
              <h2>Idea</h2>
              <p>思いついた事業アイデアをここにメモしておきます。皆さんと一緒に形に出来たら嬉しいです。</p>
            </div>
            <ul class="idea-list">
              <li class="idea-item">
                <div class="idea-image">
                  <img src="/image/idea-meet-image.png" alt="イメージ" />
                </div>
                <div class="idea-disc">
                  <p class="sub-title">出会いやつながりを求める人のためのどこでも相席アプリ</p>
                  <a class="title" href="#" alt="準備中です。">
                    <h3>Meet</h3>
                    <i class="fa-solid fa-circle-chevron-right"></i>
                  </a>
                  <p>
                    「Meet」は18～30歳の若者を対象に、同じ趣味や食事仲間、異性との出会いを提供するマッチングサービス。人集め・日程調整・店選びの手間を省き、企画者が設定したイベントに参加者が応募する仕組みで、スムーズな出会いを実現。提携飲食店を会場とすることで、店舗の集客支援とマネタイズも可能にします。
                  </p>
                </div>
              </li>
              <li class="idea-item">
                <div class="idea-image">
                  <img src="/image/idea-feereal-image.png" alt="イメージ" />
                </div>
                <div class="idea-disc">
                  <p class="sub-title">感情のインスタントシェアアプリ</p>
                  <a class="title" href="#" alt="準備中です。">
                    <h3>FeeReal</h3>
                    <i class="fa-solid fa-circle-chevron-right"></i>
                  </a>
                  <p>
                    「FeeReal」はユーザーが感情に関する問いかけに直感的に回答し、その結果を簡潔なビジュアルイメージとして各種SNSで簡単にシェアできます。これにより、言葉にしにくい感情を気軽に共有し、コミュニケーションにおける「温度感」のズレをなくすことを目指しています。
                  </p>
                </div>
              </li>
              <li class="idea-item">
                <div class="idea-image">
                  <img src="/image/idea-roughletter-image.png" alt="イメージ" />
                </div>
                <div class="idea-disc">
                  <p class="sub-title">ビジネスチャンスを逃さない。メール文化に革命を。</p>
                  <a class="title" href="#" alt="準備中です。">
                    <h3>Rough Letter</h3>
                    <i class="fa-solid fa-circle-chevron-right"></i>
                  </a>
                  <p>
                    「Rough Letter」は、名刺交換後の会話内容を記録し、AIが自動でメールの下書きを作成する営業支援サービス。スタートアップやビジネスマン向けに、効率的なフォローアップを実現。添付ファイルや訴求内容も自動反映し、人別に整理されたチャット型UIで見逃し防止と返信サポートも提供します。
                  </p>
                </div>
              </li>
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
