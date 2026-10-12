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
      title: "現況測量図は、何を確認するための図面か",
      date: "2026-10-05",
      category: "現況測量",
      summary: "売買前の資料として使うときに、図面から読み取れること・読み取れないことを整理します。",
      url: base + "p/dummy-1",
    },
    {
      title: "登記簿の面積と現況の面積が違うとき、まず確認すること",
      date: "2026-09-28",
      category: "面積・求積",
      summary: "差が出る原因の典型例と、取引前に押さえておきたい確認の順番。",
      url: base + "p/dummy-2",
    },
    {
      title: "高低差のある土地で、造成計画の前に測っておくもの",
      date: "2026-09-18",
      category: "高低・地形",
      summary: "擁壁や排水の計画に必要になる、高さの情報の取り方。",
      url: base + "p/dummy-3",
    },
    {
      title: "決済日から逆算した、測量の発注タイミング",
      date: "2026-09-10",
      category: "進め方",
      summary: "現地測量と図面作成にかかる日数から、最晩の相談日を割り出す考え方。",
      url: base + "p/dummy-4",
    },
    {
      title: "建物配置測量で記録しておきたい外構の範囲",
      date: "2026-08-30",
      category: "建物配置",
      summary: "解体前・建築前に、あとから困らない記録の取り方。",
      url: base + "p/dummy-5",
    },
    {
      title: "真北測量が必要になる場面と、方位の確認方法",
      date: "2026-08-20",
      category: "真北測量",
      summary: "日影や採光の検討で、方位が数度ずれると何が変わるか。",
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
