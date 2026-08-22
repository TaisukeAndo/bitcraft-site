import type { FC } from "hono/jsx";

export const ContactPage: FC = () => {
  return (
    <main>
      <div class="top">
        <div class="title-image">
          <img src="/contact/img/top-img.jpg" />
        </div>
        <div class="title">
          <h1>お問い合わせ</h1>
          <p>ご相談やお見積もりなど、お気軽にお問い合わせください。</p>
        </div>
      </div>
      <form class="content" id="contact-form">
        <div class="form-content">
          <div class="form-group">
            <label class="title">
              お名前 <span style="color: red;">*</span>
            </label>
            <input type="text" name="entry.1898114013" class="form-control" placeholder=" 例）山田太郎" required />
          </div>

          <div class="form-group">
            <label class="title">
              メールアドレス <span style="color: red;">*</span>
            </label>
            <input
              type="text"
              name="entry.2104696287"
              class="form-control"
              placeholder=" 例）example@mail.com"
              required
            />
          </div>

          <div class="form-group">
            <label class="title">
              ご所属 <span style="color: red;">*</span>
            </label>
            <input type="text" name="entry.1276655808" class="form-control" placeholder=" 例）株式会社〇〇" required />
          </div>

          <div class="form-group">
            <label class="title">
              お問い合わせ種別 <span style="color: red;">*</span>
            </label>
            {[
              "システム開発のご相談",
              "Webサイト制作のご依頼",
              "UI・UXデザインのご相談",
              "3DCG制作のご相談",
              "プログラミング・デザイン教育のご依頼",
              "プロジェクト管理・マネジメントのご相談",
              "事業アイデア・企画に関するご相談",
              "その他のお問い合わせ",
            ].map((label) => (
              <label class="check_label">
                <input class="radio form-check-input" name="entry.150765991" type="radio" value={label} />
                <span class="radio-icon"></span>
                {label}
              </label>
            ))}
          </div>

          <div class="form-group">
            <label class="title">
              ご相談内容 <span style="color: red;">*</span>
            </label>
            <textarea class="form-control" name="entry.93364843"></textarea>
          </div>

          <div class="form-group">
            <label class="title">
              個人情報の取得について <span style="color: red;">*</span>
            </label>
            <label class="check_label">
              <input
                class="checkbox form-check-input"
                name="entry.446305628"
                type="checkbox"
                value="プライバシーポリシーに同意します。"
                required
              />
              <span class="checkbox-icon"></span>
              <a href="/policy/" target="_blank">
                プライバシーポリシー
              </a>
              に同意します。
            </label>
          </div>
          <input class="btn btn-primary btn-lg btn-block" type="submit" value="送信" />
        </div>
      </form>
      <div class="content">
        <div class="submit form-content" id="thanks-message" style="display: none;">
          <div class="title">
            <i class="fa-regular fa-circle-check"></i>
            <h2>送信完了</h2>
          </div>
          <p>お問い合わせいただきありがとうございます。後日担当者より、メールにて返信いたします。</p>
          <a class="button" href="/">
            ホームに戻る
          </a>
        </div>
      </div>
    </main>
  );
};
