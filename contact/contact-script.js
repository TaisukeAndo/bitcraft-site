const form = document.getElementById("contact-form");
  const thanks = document.getElementById("thanks-message");

  form.addEventListener("submit", function(e) {
    e.preventDefault(); // ページ遷移を防ぐ

    const formData = new FormData(form);

    fetch("https://docs.google.com/forms/u/0/d/e/1FAIpQLScULh85kAiW2OKRvFMOIu7fpu6gw_PESrDMd7qlSXmJG2yWsg/formResponse", {
      method: "POST",
      mode: "no-cors", // これが大事
      body: formData
    })
    .then(() => {
      // 成功したと仮定してメッセージ表示（no-corsなので本当の成功判定はできない）
      form.style.display = "none";
      thanks.style.display = "block";
      
      // ← ここでトップにスクロール
      window.scrollTo({
        top: 0,
        behavior: "smooth" // スムーズにスクロールする（任意）
      });
    })
    .catch(() => {
      alert("送信に失敗しました。再度お試しください。");
    });
  });