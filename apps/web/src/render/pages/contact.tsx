import type { FC } from "hono/jsx";
import { CONTACT_INQUIRY_TYPES } from "@bitcraft/shared";

// お問い合わせフォームはGoogleフォームへのno-cors直POSTを廃止し、同一オリジンの
// POST /contact/ へ送信する自前実装に置き換えた（セミナー申込
// (seminar-apply.tsx)と同じ構造。実装計画・ユーザー要望対応）。
// no-corsではなくなったため、実際のレスポンス（成功/失敗）を読んで表示を切り替えられる。
//
// 送信中の二重送信防止・ローディング表示は共通コンポーネント
// (public/js/form-submit.js + public/css/form-submit.css)に委譲する
// （元々ボタンを押しても状態が変わらず何度でも送信できてしまう不具合があったため、
// セミナー申込フォームとも共通化した。ユーザー要望対応）。
function contactInlineScript(): string {
  return `
(function () {
  // bitcraftFormSubmitは/js/form-submit.js(defer読み込み)が定義するため、
  // この位置のインラインscriptより後に実行される。DOMContentLoaded後まで待つ
  // ことで確実に定義済みの状態で呼び出す。
  document.addEventListener("DOMContentLoaded", function () {
    window.bitcraftFormSubmit({
      formId: "contact-form",
      errorBoxId: "contact-error",
      thanksId: "thanks-message",
      buildBody: function (formData) {
        return {
          name: formData.get("name") || "",
          email: formData.get("email") || "",
          affiliation: formData.get("affiliation") || "",
          inquiryType: formData.get("inquiryType") || "",
          message: formData.get("message") || "",
          privacyConsent: formData.get("privacyConsent") === "true",
        };
      },
    });
  });
})();
`;
}

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
          <div
            id="contact-error"
            style="display: none; margin-bottom: 20px; padding: 12px 16px; background: #ffebee; color: #c62828; border-radius: 4px;"
          ></div>

          <div class="form-group">
            <label class="title">
              お名前 <span style="color: red;">*</span>
            </label>
            <input type="text" name="name" class="form-control" placeholder=" 例）山田太郎" required />
          </div>

          <div class="form-group">
            <label class="title">
              メールアドレス <span style="color: red;">*</span>
            </label>
            <input type="email" name="email" class="form-control" placeholder=" 例）example@mail.com" required />
          </div>

          <div class="form-group">
            <label class="title">
              ご所属 <span style="color: red;">*</span>
            </label>
            <input type="text" name="affiliation" class="form-control" placeholder=" 例）株式会社〇〇" required />
          </div>

          <div class="form-group">
            <label class="title">
              お問い合わせ種別 <span style="color: red;">*</span>
            </label>
            {CONTACT_INQUIRY_TYPES.map((label) => (
              <label class="check_label">
                <input class="radio form-check-input" name="inquiryType" type="radio" value={label} required />
                <span class="radio-icon"></span>
                {label}
              </label>
            ))}
          </div>

          <div class="form-group">
            <label class="title">
              ご相談内容 <span style="color: red;">*</span>
            </label>
            <textarea class="form-control" name="message" required></textarea>
          </div>

          <div class="form-group">
            <label class="title">
              個人情報の取得について <span style="color: red;">*</span>
            </label>
            <label class="check_label">
              <input class="checkbox form-check-input" name="privacyConsent" type="checkbox" value="true" required />
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

      <script dangerouslySetInnerHTML={{ __html: contactInlineScript() }} />
    </main>
  );
};
