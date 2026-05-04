// 募集期限判定ロジック
document.addEventListener("DOMContentLoaded", function() {
    // ページに設定された開催日を取得（例: <meta name="event-date" content="2026-05-25">）
    var eventDateMeta = document.querySelector('meta[name="event-date"]');
    if (!eventDateMeta) return;

    var eventDateStr = eventDateMeta.getAttribute("content");
    // 開催日の0時0分としてDateオブジェクトを作成
    var eventDate = new Date(eventDateStr + "T00:00:00+09:00");
    
    // 募集期限は開催日の3日前の23:59:59
    var deadline = new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000);
    deadline.setHours(23, 59, 59, 999);

    var now = new Date();
    
    // 期限を過ぎている場合の処理
    if (now > deadline) {
        // --- 1. 詳細ページ用の制御 ---
        var ctaButtons = document.querySelectorAll(".sd-hero__cta, .sd-cta__btn");
        ctaButtons.forEach(function(btn) {
            btn.removeAttribute("href");
            btn.innerHTML = '募集は終了しました <i class="fa-solid fa-lock"></i>';
            btn.style.backgroundColor = "#555";
            btn.style.pointerEvents = "none";
        });

        // --- 2. 申し込みページ用の制御 ---
        var form = document.getElementById("apply-form");
        var closedMsg = document.getElementById("closed-message");
        if (form && closedMsg) {
            form.style.display = "none";
            closedMsg.style.display = "block";
        }
    }
});
