const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScDbru2yfQwWov5n5heSOexj0-xeDSZMldRmxB8Dw7Mh9poHw/formResponse";

const form = document.getElementById("apply-form");
const thanks = document.getElementById("thanks-message");

// 「その他」選択時に自由記述欄を表示する
// data-other-trigger を持つラジオ/チェックボックスが選択されているかどうかで、
// 同じ .form-group 内の .form-control--other を出し分ける。
function initOtherToggles() {
  document.querySelectorAll(".form-group").forEach(function (group) {
    const otherTriggers = group.querySelectorAll("[data-other-trigger]");
    const otherInput = group.querySelector(".form-control--other");
    if (!otherTriggers.length || !otherInput) return;

    function sync() {
      const checked = Array.prototype.some.call(otherTriggers, function (input) {
        return input.checked;
      });
      otherInput.style.display = checked ? "block" : "none";
      if (!checked) otherInput.value = "";
    }

    group.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(function (input) {
      input.addEventListener("change", sync);
    });
    sync();
  });
}

// 送信直前に、「その他」が選択されている場合は自由記述欄の内容を
// そのラジオ/チェックボックス自体の送信値（value）に差し替える。
//
// Googleフォーム標準の「'その他' を追加」機能（entry.xxxxxxxxx=__other_option__ +
// entry.xxxxxxxxx.other_option_response という2フィールド構成）は、実際にフォーム経由で
// no-cors POSTしたところ 400 Bad Request になることを確認済み（Googleフォーム側の内部実装に
// 依存し、外部から直接POSTする用途では期待通り動かないため）。そのため質問側は「その他」を
// 通常の選択肢の1つとして扱い（Googleフォーム編集画面で「'その他' を追加」トグルはOFFにし、
// 選択肢に「その他」を手入力する）、送信時にJS側でその選択肢の値を自由記述の内容に
// 書き換えることで対応する。
function applyOtherValues() {
  document.querySelectorAll(".form-group").forEach(function (group) {
    const otherTriggers = group.querySelectorAll("[data-other-trigger]");
    const otherInput = group.querySelector(".form-control--other");
    if (!otherTriggers.length || !otherInput) return;

    Array.prototype.forEach.call(otherTriggers, function (input) {
      if (input.checked) {
        const text = otherInput.value.trim();
        input.value = text || "その他";
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", initOtherToggles);

form.addEventListener("submit", function (e) {
  e.preventDefault();

  applyOtherValues();
  const formData = new FormData(form);

  fetch(GOOGLE_FORM_URL, {
    method: "POST",
    mode: "no-cors", // Google Form はno-corsで送信する
    body: formData,
  })
    .then(() => {
      // no-cors のため成功・失敗の判定は不可。送信できたと仮定して表示。
      form.style.display = "none";
      thanks.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
    })
    .catch(() => {
      alert("送信に失敗しました。再度お試しください。");
    });
});