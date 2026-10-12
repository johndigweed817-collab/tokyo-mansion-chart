/* 縄野測量 — コラム一覧（not/on 連携）
   現在はダミーデータを描画しています。
   not/on 側に RSS 相当の機能ができたら、loadColumns() の中身だけを
   fetch に差し替えてください（描画側は変更不要）。 */
(function () {
  "use strict";

  var cfg = window.NAWANO || {};
  var base = (cfg.notonUrl || "").replace(/\/?$/, "/");

  // ---- ダミーデータ（not/on連携までの仮） ----
  var DUMMY_ITEMS = [
    {
      title: "境界確定測量は、売買の前に何を確かめるための測量か",
      date: "2026-10-05",
      category: "境界確定測量",
      summary: "筆界の確認でわかること、わからないことと、取引の前に済ませておく理由を整理します。",
      url: base + "p/dummy-1",
    },
    {
      title: "登記簿の面積と現況の面積が違うとき、まず確認すること",
      date: "2026-09-28",
      category: "地積更正登記",
      summary: "差が出る原因の典型例と、地積更正登記に進む前の確認の順番。",
      url: base + "p/dummy-2",
    },
    {
      title: "分筆登記を、売買の期日に間に合わせるための段取り",
      date: "2026-09-18",
      category: "分筆登記",
      summary: "測量、隣地の立会い、申請、登記の完了までの日数を、期日から逆算して考えます。",
      url: base + "p/dummy-3",
    },
    {
      title: "隣地の立会いが得られないとき、どう進めるか",
      date: "2026-09-10",
      category: "境界確定測量",
      summary: "立会いのお願いの進め方と、合意に至らない場合の筆界特定制度のあらまし。",
      url: base + "p/dummy-4",
    },
    {
      title: "新築建物の表題登記は、いつまでに必要か",
      date: "2026-08-30",
      category: "建物の登記",
      summary: "完成から1か月以内の申請と、引渡しまでに用意しておく書類の整理。",
      url: base + "p/dummy-5",
    },
    {
      title: "現況測量図と境界確定図は、何が違うのか",
      date: "2026-08-20",
      category: "測量の基礎",
      summary: "売買の資料として使うときに、それぞれの図面で言えること・言えないこと。",
      url: base + "p/dummy-6",
    },
  ];

  /** 記事一覧を返す。将来は not/on のフィードを fetch して同じ形に整形する。 */
  function loadColumns() {
    // 例）return fetch(base + "feed.json").then(function (r) { return r.json(); }).then(normalize);
    return Promise.resolve(DUMMY_ITEMS);
  }

  function formatDate(iso) {
    var p = iso.split("-");
    return p[0] + "年" + Number(p[1]) + "月" + Number(p[2]) + "日";
  }

  function render(el, items, limit) {
    var list = limit ? items.slice(0, limit) : items;
    var showSummary = el.getAttribute("data-summary") === "true";
    el.textContent = "";
    list.forEach(function (it) {
      var li = document.createElement("li");

      var time = document.createElement("time");
      time.setAttribute("datetime", it.date);
      time.textContent = formatDate(it.date) + "　" + it.category;
      li.appendChild(time);

      var a = document.createElement("a");
      a.href = it.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = it.title;
      li.appendChild(a);

      if (showSummary && it.summary) {
        var p = document.createElement("p");
        p.className = "feed-sum";
        p.textContent = it.summary;
        li.appendChild(p);
      }
      el.appendChild(li);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var targets = document.querySelectorAll("[data-columns]");
    if (!targets.length) return;
    loadColumns().then(function (items) {
      Array.prototype.forEach.call(targets, function (el) {
        var limit = parseInt(el.getAttribute("data-limit"), 10) || 0;
        render(el, items, limit);
      });
    });
  });
})();
