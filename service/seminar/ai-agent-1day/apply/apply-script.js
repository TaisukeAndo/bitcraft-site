const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScDbru2yfQwWov5n5heSOexj0-xeDSZMldRmxB8Dw7Mh9poHw/formResponse";

const form = document.getElementById("apply-form");
const thanks = document.getElementById("thanks-message");

// 「その他」選択時に自由記述欄を表示する
// data-other-trigger を持つラジオ/チェックボックスが選択されているかどうかで、
// 同じ .form-group 内の .form-control--other（entry.xxxxxxxxx.other_option_response）を出し分ける。
// display:none でも <input> はDOMに存在する限りFormDataに含まれるため、
// 送信時に別途値を書き換えるような処理は不要（非表示中は空文字のまま送られる）。
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

document.addEventListener("DOMContentLoaded", initOtherToggles);

form.addEventListener("submit", function (e) {
  e.preventDefault();

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