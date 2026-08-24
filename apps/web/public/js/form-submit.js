// 同一オリジンJSON POSTするフォーム全般（お問い合わせ・セミナー申込等）で使う
// 共通コンポーネント。送信ボタンの二重送信防止・「送信中」ローディング表示を
// 一箇所にまとめる（元々ボタンが押しっぱなしでも何度でも送信できてしまう
// 不具合があったため、フォームごとの個別実装ではなく共通化した）。
//
// 使い方:
//   window.bitcraftFormSubmit({
//     formId: "contact-form",
//     errorBoxId: "contact-error",  // 省略可。無ければalertにフォールバック
//     thanksId: "thanks-message",   // 省略可
//     endpoint: "/contact/",        // 省略時は現在のパス(window.location.pathname)
//     loadingLabel: "送信中...",     // 省略可
//     buildBody: function (formData) { return {...}; }, // 省略時はFormDataをそのままObjectに変換
//   });
window.bitcraftFormSubmit = function (config) {
  var form = document.getElementById(config.formId);
  if (!form) return;

  var errorBox = config.errorBoxId ? document.getElementById(config.errorBoxId) : null;
  var thanks = config.thanksId ? document.getElementById(config.thanksId) : null;
  var submitBtn = form.querySelector('[type="submit"]');
  var loadingLabel = config.loadingLabel || "送信中...";
  var originalLabel = submitBtn ? submitBtn.value || submitBtn.textContent : null;
  var submitting = false; // ボタンのdisabled反映より前のダブルクリックに対する最終防衛線

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle("is-loading", isLoading);
    if (submitBtn.tagName === "INPUT") {
      submitBtn.value = isLoading ? loadingLabel : originalLabel;
    } else {
      submitBtn.textContent = isLoading ? loadingLabel : originalLabel;
    }
  }

  function showError(message) {
    if (errorBox) {
      errorBox.textContent = message;
      errorBox.style.display = "block";
    } else {
      alert(message);
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitting) return;
    submitting = true;
    setLoading(true);
    if (errorBox) {
      errorBox.style.display = "none";
      errorBox.textContent = "";
    }

    var formData = new FormData(form);
    var body = config.buildBody ? config.buildBody(formData) : Object.fromEntries(formData.entries());

    fetch(config.endpoint || window.location.pathname, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          submitting = false;
          setLoading(false);
          showError(result.data && result.data.error ? result.data.error : "送信に失敗しました。再度お試しください。");
          return;
        }
        // 成功時はフォーム自体を隠して完了表示に切り替えるため、ボタン状態を戻す必要はない。
        form.style.display = "none";
        if (thanks) thanks.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch(function () {
        submitting = false;
        setLoading(false);
        showError("送信に失敗しました。再度お試しください。");
      });
  });
};
