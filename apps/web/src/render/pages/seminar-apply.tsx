import type { FC } from "hono/jsx";
import type { SeminarRow } from "@bitcraft/db";
import type { SeminarApplyForm, SeminarApplyFormField } from "@bitcraft/shared";
import { mediaUrl } from "../../lib/media-url";

function FieldInput({ field }: { field: SeminarApplyFormField }) {
  const commonProps = {
    name: field.id,
    class: "form-control",
    placeholder: field.placeholder,
  };
  switch (field.type) {
    case "text":
      return <input type="text" {...commonProps} required={field.required} />;
    case "email":
      return <input type="email" {...commonProps} required={field.required} />;
    case "tel":
      return <input type="tel" {...commonProps} />;
    case "textarea":
      return <textarea class="form-control" placeholder={field.placeholder} name={field.id} />;
    case "radio":
    case "checkbox":
      return (
        <>
          {(field.options ?? []).map((opt) => (
            <label class="check_label">
              <input
                class={`${field.type} form-check-input`}
                name={field.id}
                type={field.type}
                value={opt}
                required={field.required && field.type === "radio"}
              />
              <span class={`${field.type === "radio" ? "radio" : "checkbox"}-icon`}></span>
              {opt}
            </label>
          ))}
          {field.otherOption ? (
            <>
              <label class="check_label">
                <input
                  class={`${field.type} form-check-input`}
                  name={field.id}
                  type={field.type}
                  value="__other_option__"
                  data-other-trigger
                />
                <span class={`${field.type === "radio" ? "radio" : "checkbox"}-icon`}></span>
                その他
              </label>
              <input
                type="text"
                class="form-control form-control--other"
                name={`${field.id}.other`}
                placeholder=" その他の場合、具体的にご記入ください"
                style="display: none;"
              />
            </>
          ) : null}
        </>
      );
    default:
      return null;
  }
}

function groupBySection(fields: SeminarApplyFormField[]): { section: string; fields: SeminarApplyFormField[] }[] {
  const groups: { section: string; fields: SeminarApplyFormField[] }[] = [];
  for (const field of fields) {
    const last = groups.at(-1);
    if (last && last.section === field.section) {
      last.fields.push(field);
    } else {
      groups.push({ section: field.section, fields: [field] });
    }
  }
  return groups;
}

// 申込フォームはGoogleフォームへのno-cors直POSTを廃止し、同一オリジンの
// POST /service/seminar/:slug/apply/ へ送信する自前実装に置き換えた
// （実装計画: apps/webがapps/apiへService Binding経由で委譲、ユーザー要望対応）。
// no-corsではなくなったため、実際のレスポンス（成功/失敗）を読んで表示を切り替えられる
// （旧実装は送信できたと仮定して「完了」表示を出すだけだった）。
function applyInlineScript(): string {
  return `
(function () {
  var form = document.getElementById("apply-form");
  var thanks = document.getElementById("thanks-message");
  var errorBox = document.getElementById("apply-error");
  if (!form) return;

  document.querySelectorAll(".form-group").forEach(function (group) {
    var otherTriggers = group.querySelectorAll("[data-other-trigger]");
    var otherInput = group.querySelector(".form-control--other");
    if (!otherTriggers.length || !otherInput) return;
    function sync() {
      var checked = Array.prototype.some.call(otherTriggers, function (input) { return input.checked; });
      otherInput.style.display = checked ? "block" : "none";
      if (!checked) otherInput.value = "";
    }
    group.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(function (input) {
      input.addEventListener("change", sync);
    });
    sync();
  });

  function buildAnswers() {
    var answers = {};
    var formData = new FormData(form);
    formData.forEach(function (value, key) {
      if (value === "__other_option__") return; // 「その他」トリガー自体は送らない
      if (answers[key] === undefined) {
        answers[key] = value;
      } else if (Array.isArray(answers[key])) {
        answers[key].push(value);
      } else {
        answers[key] = [answers[key], value];
      }
    });
    return answers;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (errorBox) { errorBox.style.display = "none"; errorBox.textContent = ""; }

    fetch(window.location.pathname, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: buildAnswers() }),
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

export const SeminarApplyPage: FC<{
  seminar: SeminarRow;
  form: SeminarApplyForm;
  registrationClosed: boolean;
}> = ({ seminar, form, registrationClosed }) => {
  const groups = groupBySection(form.fields);
  const heroImage = mediaUrl(seminar.heroImageKey);

  return (
    <main>
      <div class="top">
        {heroImage ? (
          <div class="title-image">
            <img src={heroImage} alt={seminar.title.replace(/<br>/g, "")} />
          </div>
        ) : null}
        <div class="title">
          <h1>参加申し込み</h1>
          <p>
            {seminar.title.replace(/<br>/g, "")}（{seminar.eventDateDisplay ?? seminar.eventDate}）
          </p>
        </div>
      </div>

      {registrationClosed ? (
        <div class="content" style="text-align: center; padding: 60px 20px;">
          <div class="title" style="margin-bottom: 20px;">
            <i class="fa-solid fa-lock" style="font-size: 40px; color: #555; margin-bottom: 15px; display: block;"></i>
            <h2>募集は終了しました</h2>
          </div>
          <p style="margin-bottom: 30px;">
            本セミナーの参加申し込みは受付を終了いたしました。多数のお申し込みをいただき、誠にありがとうございました。
          </p>
          <a
            class="button"
            href={`/service/seminar/${seminar.slug}/`}
            style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 4px;"
          >
            セミナー詳細に戻る
          </a>
        </div>
      ) : (
        <>
          <form class="content" id="apply-form">
            <div class="form-content">
              <div
                id="apply-error"
                style="display: none; margin-bottom: 20px; padding: 12px 16px; background: #ffebee; color: #c62828; border-radius: 4px;"
              ></div>
              {groups.map((group) => (
                <>
                  <div class="form-section-title">{group.section}</div>
                  {group.fields.map((field) => (
                    <div class="form-group">
                      <label class="title">
                        {field.label} {field.required ? <span class="required">*</span> : null}
                      </label>
                      {field.section === "同意" ? (
                        <label class="check_label">
                          <input class="checkbox form-check-input" name={field.id} type="checkbox" value={field.options?.[0]} required={field.required} />
                          <span class="checkbox-icon"></span>
                          <a href="/policy/" target="_blank">
                            プライバシーポリシー
                          </a>
                          に同意します。
                        </label>
                      ) : (
                        <FieldInput field={field} />
                      )}
                    </div>
                  ))}
                </>
              ))}
              <input class="btn btn-primary btn-lg btn-block" type="submit" value="申し込む" />
            </div>
          </form>

          <div class="content">
            <div class="submit form-content" id="thanks-message" style="display: none;">
              <div class="title">
                <i class="fa-regular fa-circle-check"></i>
                <h2>申し込み完了</h2>
              </div>
              <p>
                お申し込みありがとうございます。<br />
                この後すぐ、ご登録のメールアドレス宛に確認メールをお送りします。数分経っても届かない場合は、お手数ですが迷惑メールフォルダをご確認のうえ、
                <a href="/contact/">お問い合わせ</a>ください。
              </p>
              <a class="button" href={`/service/seminar/${seminar.slug}/`}>
                セミナー詳細に戻る
              </a>
            </div>
          </div>

          <script dangerouslySetInnerHTML={{ __html: applyInlineScript() }} />
        </>
      )}
    </main>
  );
};
