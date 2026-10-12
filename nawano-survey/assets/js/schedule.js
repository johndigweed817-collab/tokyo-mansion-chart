/* 縄野測量 — 決済日からの逆算ツール
   決済日・契約日から、工程ごとの最晩の日付を営業日（土日除く）で逆算します。
   日数は目安（ダミー）です。実際の値は測量士本人と決めてください。 */
(function () {
  "use strict";

  var form = document.getElementById("calc-form");
  var out = document.getElementById("calc-result");
  if (!form || !out) return;

  // 規模ごとの所要営業日（ダミー）
  var DAYS = {
    s: { field: 3, draw: 3, label: "小規模（〜300㎡）" },
    m: { field: 5, draw: 4, label: "中規模（〜1,000㎡）" },
    l: { field: 8, draw: 6, label: "大規模（1,000㎡超）" },
  };
  var BUFFER = 2; // 納品から決済日までの予備日

  function isWeekday(d) { var w = d.getDay(); return w !== 0 && w !== 6; }

  /** 営業日を n 日さかのぼる（土日はカウントしない） */
  function subBusinessDays(date, n) {
    var d = new Date(date.getTime());
    while (n > 0) {
      d.setDate(d.getDate() - 1);
      if (isWeekday(d)) n--;
    }
    return d;
  }

  function fmt(d) {
    return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  }

  function parseDate(v) {
    var p = v.split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function item(date, label, note, cls) {
    var li = document.createElement("li");
    if (cls) li.className = cls;
    var d = document.createElement("span");
    d.className = "t-date";
    d.textContent = fmt(date);
    var l = document.createElement("span");
    l.className = "t-label";
    l.textContent = label;
    if (note) {
      var n = document.createElement("span");
      n.className = "t-note";
      n.textContent = note;
      l.appendChild(n);
    }
    li.appendChild(d);
    li.appendChild(l);
    return li;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = form.elements.settle.value;
    out.textContent = "";
    if (!v) {
      var warn0 = document.createElement("p");
      warn0.className = "calc-warn";
      warn0.textContent = "決済日・契約日を入力してください。";
      out.appendChild(warn0);
      form.elements.settle.focus();
      return;
    }

    var settle = parseDate(v);
    var cfg = DAYS[form.elements.size.value] || DAYS.m;

    var deliver = subBusinessDays(settle, BUFFER);
    var drawStart = subBusinessDays(deliver, cfg.draw);
    var fieldStart = subBusinessDays(drawStart, cfg.field);
    var order = subBusinessDays(fieldStart, 1);
    var consult = subBusinessDays(order, 1);

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var summary = document.createElement("p");
    summary.className = "calc-summary";
    summary.textContent = consult < today
      ? "通常の工程での最も遅いご相談日は、" + fmt(consult) + "でした。"
      : "最も遅いご相談日は、" + fmt(consult) + "です。";
    out.appendChild(summary);

    if (consult < today) {
      var warn = document.createElement("p");
      warn.className = "calc-warn";
      warn.textContent =
        "通常の工程では、決済日に間に合わない可能性があります。工程の短縮ができるかを個別に確認しますので、お電話かフォームでご相談ください。";
      out.appendChild(warn);
    }

    var ol = document.createElement("ol");
    ol.className = "timeline";
    ol.appendChild(item(consult, "ご相談・見積依頼", "所在地と希望納期をお知らせください。1営業日以内に一次回答します。"));
    ol.appendChild(item(order, "ご発注"));
    ol.appendChild(item(fieldStart, "現地測量", "日程調整から測量完了まで " + cfg.field + " 営業日"));
    ol.appendChild(item(drawStart, "図面作成・検査", cfg.draw + " 営業日"));
    ol.appendChild(item(deliver, "成果品の納品", "決済日の " + BUFFER + " 営業日前"));
    ol.appendChild(item(settle, "決済日・契約日", cfg.label + "の場合の目安", "t-final"));
    out.appendChild(ol);
  });
})();
