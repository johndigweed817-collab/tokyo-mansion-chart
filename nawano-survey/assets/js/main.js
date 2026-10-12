/* 縄野測量 — 共通スクリプト（ナビ開閉・モック帯）
   <head> で同期読み込みし、JS有効時だけ html に .js を付与します。 */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var cfg = window.NAWANO || {};

  document.addEventListener("DOMContentLoaded", function () {
    // モック表示
    if (cfg.mock) {
      document.body.classList.add("is-mock");
      var bar = document.createElement("div");
      bar.className = "mockbar";
      bar.setAttribute("role", "note");
      bar.textContent =
        "確認用のモックです。数値・氏名・連絡先・料金は仮のもので、点線の下線が付いた箇所が差し替え対象です。";
      document.body.insertBefore(bar, document.body.firstChild);
    }

    // スマートフォンのメニュー開閉
    var btn = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!btn || !nav) return;

    function setOpen(open) {
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "閉じる" : "メニュー";
    }

    btn.addEventListener("click", function () {
      setOpen(!nav.classList.contains("is-open"));
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        btn.focus();
      }
    });

    // メニュー内のリンクを押したら閉じる（同一ページ内アンカー対策）
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
  });
})();
