/* 縄野測量 — 納期の目安ツール
   ご希望の納品日から、工程ごとの最も遅い日付を営業日（土日除く）で逆算します。
   日数は目安（ダミー）です。実際の値は土地家屋調査士本人と決めてください。 */
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
  // 業務ごとの、隣地の立会い・境界確認の日数と、登記申請から完了までの日数（ダミー）
  var SERVICE = {
    kyokai:   { meet: 10, regist: 0 },
    bunpitsu: { meet: 8,  regist: 7 },
    chiseki:  { meet: 8,  regist: 7 },
    tatemono: { meet: 0,  regist: 7 },
    genkyo:   { meet: 0,  regist: 0 },
  };
  var BUFFER = 2; // 納品から、ご希望の納品日までの予備日

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
      warn0.textContent = "ご希望の納品日を入力してください。";
      out.appendChild(warn0);
      form.elements.settle.focus();
      return;
    }

    var settle = parseDate(v);
    var cfg = DAYS[form.elements.size.value] || DAYS.m;

    var svc = SERVICE[form.elements.service.value] || SERVICE.genkyo;
    var deliver = subBusinessDays(settle, BUFFER);
    var registStart = svc.regist ? subBusinessDays(deliver, svc.regist) : deliver;
    var drawStart = subBusinessDays(registStart, cfg.draw);
    var meetStart = svc.meet ? subBusinessDays(drawStart, svc.meet) : drawStart;
    var fieldStart = subBusinessDays(meetStart, cfg.field);
    var order = subBusinessDays(fieldStart, 1);
    var consult = subBusinessDays(order, 1);

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var summary = document.createElement("p");
    summary.className = "calc-summary";
    summary.textContent = consult < today
      ? "通常の工程でご相談いただく期限は、" + fmt(consult) + "でした。"
      : "遅くとも、" + fmt(consult) + "までにご相談ください。";
    out.appendChild(summary);

    if (consult < today) {
      var warn = document.createElement("p");
      warn.className = "calc-warn";
      warn.textContent =
        "通常の工程では、ご希望の納品日に間に合わない可能性があります。工程を短縮できるかを個別に確認しますので、お電話かフォームでご相談ください。";
      out.appendChild(warn);
    }

    var ol = document.createElement("ol");
    ol.className = "timeline";
    ol.appendChild(item(consult, "ご相談・見積依頼", "所在地と希望納期をお知らせください。1営業日以内に一次回答します。"));
    ol.appendChild(item(order, "ご発注"));
    ol.appendChild(item(fieldStart, "資料調査・現地測量", "日程調整から測量完了まで " + cfg.field + " 営業日"));
    if (svc.meet) ol.appendChild(item(meetStart, "隣地の立会い・境界の確認", "隣地との日程調整を含め " + svc.meet + " 営業日"));
    ol.appendChild(item(drawStart, svc.regist ? "図面・申請書類の作成" : "図面作成・検査", cfg.draw + " 営業日"));
    if (svc.regist) ol.appendChild(item(registStart, "登記の申請", "完了まで " + svc.regist + " 営業日（法務局の処理による）"));
    ol.appendChild(item(deliver, svc.regist ? "成果品・登記完了証の納品" : "成果品の納品", "ご希望の納品日の " + BUFFER + " 営業日前"));
    ol.appendChild(item(settle, "ご希望の納品日", cfg.label + "の場合の目安", "t-final"));
    out.appendChild(ol);
  });
})();
