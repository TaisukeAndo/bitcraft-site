const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/u/0/d/e/1FAIpQLScfh0RytGYaCDME32fxCtmYFTSYOK2axD46jZmSIbyeYiKM0A/formResponse";

const form = document.getElementById("apply-form");
const thanks = document.getElementById("thanks-message");

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