// Initialize Lenis
const lenis = new Lenis({
    auto: true,
});

// Animation frame setup
function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Scroll event logging
lenis.on('scroll', (e) => {
    console.log(e);
});

//スムーズスクロール
$(function(){
    $('a[href^=#]').click(function() {
    var speed = 500; // スクロール速度(ミリ秒)
    var href = $(this).attr("href");
    var target = $(href == "#" || href == "" ? 'html' : href);
    var position = target.offset().top;
    $('html').animate({scrollTop:position}, speed, 'swing');
    return false;
    });
});

// バーガーメニューのいずれかのボタンを押すと閉じる
document.addEventListener("DOMContentLoaded", function () {
    const menuBtn = document.getElementById("menu-btn");
    const menuLinks = document.querySelectorAll(".menu a");

    menuLinks.forEach(link => {
        link.addEventListener("click", function () {
            menuBtn.checked = false; // メニューを閉じる
        });
    });
});