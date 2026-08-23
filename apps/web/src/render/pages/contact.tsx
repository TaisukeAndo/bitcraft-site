import type { FC } from "hono/jsx";
import { CONTACT_INQUIRY_TYPES } from "@bitcraft/shared";

// お問い合わせフォームはGoogleフォームへのno-cors直POSTを廃止し、同一オリジンの
// POST /contact/ へ送信する自前実装に置き換えた（セミナー申込
// (seminar-apply.tsx)と同じ構造。実装計画・ユーザー要望対応）。
// no-corsではなくなったため、実際のレスポンス（成功/失敗）を読んで表示を切り替えられる。
function contactInlineScript(): string {
  return `
(function () {
  var form = document.getElementById("contact-form");
  var thanks = document.getElementById("thanks-message");
  var errorBox = document.getElementById("contact-error");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (errorBox) { errorBox.style.display = "none"; errorBox.textContent = ""; }

    var formData = new FormData(form);
    var body = {
      name: formData.get("name") || "",
      email: formData.get("email") || "",
      affiliation: formData.get("affiliation") || "",
      inquiryType: formData.get("inquiryType") || "",
      message: formData.get("message") || "",
      privacyConsent: formData.get("privacyConsent") === "true",
    };

    fetch(window.location.pathname, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        if (!result.ok) {
          var message = result.data && result.data.error ? result.data.error : "送信に失敗しました。再度お試しください。";
          if (errorBox) {
            errorBox.textContent = message;
            errorBox.style.display = "block";
          } else {
            alert(message);
          }
          return;
        }
        form.style.display = "none";
        if (thanks) thanks.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch(function () {
        if (errorBox) {
          errorBox.textContent = "送信に失敗しました。再度お試しください。";
          errorBox.style.display = "block";
        } else {
          alert("送信に失敗しました。再度お試しください。");
        }
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
