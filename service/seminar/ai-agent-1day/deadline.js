// 募集期限判定ロジック
document.addEventListener("DOMContentLoaded", function() {
    // ページに設定された開催日を取得（例: <meta name="event-date" content="2026-05-25">）
    var eventDateMeta = document.querySelector('meta[name="event-date"]');
    if (!eventDateMeta) return;

    var eventDateStr = eventDateMeta.getAttribute("content");
    // 開催日の0時0分としてDateオブジェクトを作成
    var eventDate = new Date(eventDateStr + "T00:00:00+09:00");

    // 募集期限は開催日の前日の23:59:59
    var deadline = new Date(eventDate.getTime() - 1 * 24 * 60 * 60 * 1000);
    deadline.setHours(23, 59, 59, 999);

    var now = new Date();

    // --- 手動ロック（<meta name="apply-locked" content="true"> がある場合のみ）
    //     GAS・スプレッドシート等バックエンドの準備がまだ整っていないため、
    //     日付に関わらず強制的に「準備中」表示にする。募集開始日を自動判定する
    //     仕組み（registration-open-date）は廃止し、このmetaタグの有無だけで
    //     手動で開閉を制御する。準備が整ったらこのmetaタグごと削除する。 ---
    var manualLockMeta = document.querySelector('meta[name="apply-locked"]');
    if (manualLockMeta && manualLockMeta.getAttribute("content") === "true") {
        // 1. 詳細ページ用の制御
        var lockCtaButtons = document.querySelectorAll(".sd-hero__cta, .sd-cta__btn");
        lockCtaButtons.forEach(function(btn) {
            btn.removeAttribute("href");
            btn.innerHTML = 'まもなく申込開始 <i class="fa-solid fa-clock"></i>';
            btn.style.backgroundColor = "#555";
            btn.style.pointerEvents = "none";
        });

        // 2. 申し込みページ用の制御
        var lockForm = document.getElementById("apply-form");
        var lockNotOpenMsg = document.getElementById("not-open-message");
        if (lockForm && lockNotOpenMsg) {
            lockForm.style.display = "none";
            lockNotOpenMsg.style.display = "block";
        }

        // 手動ロック中は他の日付判定を行う意味が無いのでここで終了する
        return;
    }

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
