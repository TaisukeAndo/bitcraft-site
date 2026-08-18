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
    //     GAS・スプレッドシート等バックエンドの準備がまだ整っていない場合に、
    //     registration-open-date を過ぎていても強制的に「準備中」表示にするための
    //     一時的な上書き。準備が整ったらこのmetaタグごと削除する。 ---
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

    // --- 募集開始前の制御（<meta name="registration-open-date"> がある場合のみ。
    //     無ければ従来どおり常に受付中として扱う） ---
    var openDateMeta = document.querySelector('meta[name="registration-open-date"]');
    if (openDateMeta) {
        var openDate = new Date(openDateMeta.getAttribute("content") + "T00:00:00+09:00");
        if (now < openDate) {
            var weekday = ["日", "月", "火", "水", "木", "金", "土"][openDate.getDay()];
            var openLabel = (openDate.getMonth() + 1) + "/" + openDate.getDate() + "（" + weekday + "）";

            // 1. 詳細ページ用の制御
            var preOpenCtaButtons = document.querySelectorAll(".sd-hero__cta, .sd-cta__btn");
            preOpenCtaButtons.forEach(function(btn) {
                btn.removeAttribute("href");
                btn.innerHTML = openLabel + "より申込開始 <i class=\"fa-solid fa-clock\"></i>";
                btn.style.backgroundColor = "#555";
                btn.style.pointerEvents = "none";
            });

            // 2. 申し込みページ用の制御
            var preOpenForm = document.getElementById("apply-form");
            var notOpenMsg = document.getElementById("not-open-message");
            if (preOpenForm && notOpenMsg) {
                preOpenForm.style.display = "none";
                notOpenMsg.style.display = "block";
            }

            // 募集開始前は締切判定を行う意味が無いのでここで終了する
            return;
        }
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
