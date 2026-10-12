/* 縄野測量 — 修正要求シート
   ページの画面イメージから箇所を選び、修正内容・通信欄を入力して保存します。
   入力はこのブラウザ（localStorage）へ自動保存。ファイル（JSON/CSV）への書き出し・読み込みもできます。 */
(function () {
  "use strict";

  var DATA = window.REVIEW_DATA;
  var KEY = "nawano-review-v1";
  var KINDS = ["文言の修正", "ダミーの差し替え", "画像・写真", "削除してほしい", "追加してほしい", "デザイン・見せ方", "確認・質問"];
  var STATUS = ["未対応", "対応済み", "保留"];
  var ANS = ["未回答", "差し替える", "このままでよい"];

  /* ---------- データ索引 ---------- */
  var secIndex = {};   // id -> {sec, page}
  DATA.pages.forEach(function (pg) {
    pg.sections.forEach(function (s) {
      if (!secIndex[s.id]) secIndex[s.id] = { sec: s, page: pg };
    });
  });
  var ALL = { id: "ALL-01", name: "サイト全体・ページを特定しない内容" };
  var dummyMap = {};   // text -> [secId]
  var dummyOrder = [];
  DATA.pages.forEach(function (pg) {
    pg.sections.forEach(function (s) {
      s.dummies.forEach(function (t) {
        if (!dummyMap[t]) { dummyMap[t] = []; dummyOrder.push(t); }
        if (dummyMap[t].indexOf(s.id) < 0) dummyMap[t].push(s.id);
      });
    });
  });

  /* ---------- 状態 ---------- */
  var state = load() || { v: 1, who: { name: "", company: "", date: "" }, msg: "", rows: [], dummies: {}, seq: 0 };
  var ui = { tab: "pick", page: DATA.pages[0].id, sec: null };
  var storageOk = true;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? normalize(JSON.parse(raw)) : null;
    } catch (e) { return null; }
  }
  function normalize(o) {
    if (!o || typeof o !== "object") return null;
    var s = { v: 1, who: o.who || {}, msg: String(o.msg || ""), rows: [], dummies: o.dummies || {}, seq: Number(o.seq) || 0 };
    s.who = { name: String(s.who.name || ""), company: String(s.who.company || ""), date: String(s.who.date || "") };
    (Array.isArray(o.rows) ? o.rows : []).forEach(function (r) {
      s.rows.push({
        id: Number(r.id) || ++s.seq, sec: String(r.sec || ALL.id), kind: String(r.kind || KINDS[0]),
        cur: String(r.cur || ""), rev: String(r.rev || ""), note: String(r.note || ""), status: String(r.status || STATUS[0])
      });
      s.seq = Math.max(s.seq, s.rows[s.rows.length - 1].id);
    });
    return s;
  }
  var timer = null;
  function save() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
        storageOk = true;
        setSave("自動保存済み " + hhmm(new Date()));
      } catch (e) {
        storageOk = false;
        setSave("自動保存できません。書き出して保存してください");
      }
    }, 300);
  }
  function setSave(t) { document.getElementById("save-state").textContent = t; }
  function hhmm(d) { return d.getHours() + ":" + ("0" + d.getMinutes()).slice(-2); }

  /* ---------- DOM補助 ---------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function toast(t) {
    var n = document.getElementById("toast");
    n.textContent = t; n.classList.add("on");
    clearTimeout(toast.t); toast.t = setTimeout(function () { n.classList.remove("on"); }, 2200);
  }
  function secLabel(id) {
    if (id === ALL.id) return ALL.id + "　" + ALL.name;
    var x = secIndex[id];
    return x ? id + "　" + x.sec.name : id;
  }
  function pageOf(id) {
    if (id === ALL.id) return "全体";
    var x = secIndex[id];
    if (!x) return "";
    return id.indexOf("COM-") === 0 ? "共通" : x.page.title;
  }
  function countFor(id) { return state.rows.filter(function (r) { return r.sec === id; }).length; }
  function crop(sec, pg, cls) {
    var W = pg.w, H = pg.h;
    var bx = sec.w >= W ? 0 : sec.x / (W - sec.w) * 100;
    var by = sec.h >= H ? 0 : sec.y / (H - sec.h) * 100;
    var d = el("div", { class: cls || "crop", role: "img", "aria-label": sec.name + "の画面イメージ" });
    d.style.aspectRatio = sec.w + " / " + sec.h;
    d.style.backgroundImage = "url(" + pg.img + ")";
    d.style.backgroundSize = (W / sec.w * 100) + "% auto";
    d.style.backgroundPosition = bx + "% " + by + "%";
    return d;
  }
  function cropFor(id) {
    var x = secIndex[id];
    return x ? crop(x.sec, x.page, "crop thumb-crop") : null;
  }

  /* ---------- 行 ---------- */
  function addRow(secId, kind, cur) {
    var r = { id: ++state.seq, sec: secId, kind: kind || KINDS[0], cur: cur || "", rev: "", note: "", status: STATUS[0] };
    state.rows.push(r);
    save(); refreshCounts();
    return r;
  }
  function delRow(r) {
    if (!confirm("この修正要求を削除します。よろしいですか？")) return false;
    state.rows = state.rows.filter(function (x) { return x !== r; });
    save(); refreshCounts();
    return true;
  }
  function sortedRows() {
    var order = {};
    var i = 0;
    ["COM-H"].concat([].concat.apply([], DATA.pages.map(function (p) { return p.sections.map(function (s) { return s.id; }); })), ["COM-F", ALL.id]).forEach(function (id) {
      if (!(id in order)) order[id] = i++;
    });
    return state.rows.slice().sort(function (a, b) { return (order[a.sec] - order[b.sec]) || (a.id - b.id); });
  }
  function selectEl(opts, val, on) {
    var s = el("select", { onchange: function () { on(s.value); } });
    opts.forEach(function (o) { var op = el("option", { text: o }); if (o === val) op.selected = true; s.appendChild(op); });
    return s;
  }
  function textField(label, val, rows, on, ph) {
    var t = el("textarea", { rows: rows, placeholder: ph || "", oninput: function () { on(t.value); } });
    t.value = val;
    return el("label", { class: "field" }, [el("span", { text: label }), t]);
  }
  function rowCard(r, no, showSec, onDeleted) {
    var card = el("article", { class: "row" });
    card.appendChild(el("div", { class: "row-top" }, [
      el("div", null, [el("span", { class: "row-no", text: "修正 " + no }), showSec ? el("div", { class: "row-sec", text: pageOf(r.sec) + "　" + secLabel(r.sec) }) : null]),
      el("button", { type: "button", class: "btn btn-sm btn-del", text: "削除", onclick: function () { if (delRow(r)) onDeleted(); } })
    ]));
    if (showSec) { var c = cropFor(r.sec); if (c) { c.style.maxWidth = "320px"; c.style.maxHeight = "90px"; card.appendChild(c); } }
    var k = selectEl(KINDS, r.kind, function (v) { r.kind = v; save(); });
    card.appendChild(el("label", { class: "field" }, [el("span", { text: "種別" }), k]));
    card.appendChild(textField("現在の文言・対象（書き換えても構いません）", r.cur, 2, function (v) { r.cur = v; save(); }));
    card.appendChild(textField("修正後（正しい内容・希望する内容）", r.rev, 3, function (v) { r.rev = v; save(); }, "例：電話番号は 03-1234-5678 です"));
    card.appendChild(textField("通信欄（理由・ご質問・制作へのご連絡）", r.note, 2, function (v) { r.note = v; save(); }));
    var st = selectEl(STATUS, r.status, function (v) { r.status = v; save(); });
    card.appendChild(el("label", { class: "field field-maker" }, [el("span", { text: "対応状況（制作側が記入）" }), st]));
    return card;
  }

  /* ---------- タブ1：ページから選ぶ ---------- */
  function renderIndex() {
    var box = document.getElementById("index");
    box.textContent = "";
    function secBtn(id, name) {
      var b = el("button", { type: "button", class: "ix-sec", "data-sec": id, "aria-current": ui.sec === id ? "true" : "false", onclick: function () { selectSec(id); } }, [
        el("span", { class: "ix-id", text: id }), el("span", { class: "ix-name", text: name }),
        el("span", { class: "count", "data-count": id, text: countFor(id) || "" })
      ]);
      return b;
    }
    box.appendChild(el("div", { class: "ix-group", text: "全体" }));
    box.appendChild(secBtn(ALL.id, ALL.name));
    box.appendChild(el("div", { class: "ix-group", text: "全ページ共通" }));
    box.appendChild(secBtn("COM-H", secIndex["COM-H"].sec.name));
    box.appendChild(secBtn("COM-F", secIndex["COM-F"].sec.name));
    box.appendChild(el("div", { class: "ix-group", text: "ページ構成" }));
    DATA.pages.forEach(function (pg) {
      box.appendChild(el("button", {
        type: "button", class: "ix-page", "aria-current": (ui.page === pg.id && !ui.sec) ? "true" : "false",
        onclick: function () { ui.page = pg.id; ui.sec = null; renderPick(); }
      }, [pg.title, el("small", { text: pg.file + "　" + pg.role })]));
      pg.sections.forEach(function (s) {
        if (s.id.indexOf("COM-") === 0) return;
        box.appendChild(secBtn(s.id, s.name));
      });
    });
  }
  function renderPreview() {
    var box = document.getElementById("preview");
    box.textContent = "";
    var pg = DATA.pages.filter(function (p) { return p.id === ui.page; })[0];
    box.appendChild(el("div", { class: "pv-head" }, [
      el("h2", { text: pg.title }),
      el("span", { class: "muted", text: pg.file + "　枠をクリックして箇所を選びます" })
    ]));
    var wrap = el("div", { class: "pv-wrap" });
    var img = el("img", { src: pg.img, alt: pg.title + "の画面イメージ", width: pg.w, height: pg.h });
    wrap.appendChild(img);
    pg.sections.forEach(function (s) {
      var b = el("button", {
        type: "button", class: "hot", "data-sec": s.id, "aria-label": s.id + " " + s.name, "aria-current": ui.sec === s.id ? "true" : "false",
        onclick: function () { selectSec(s.id, true); }
      }, [el("span", { class: "hot-tag", text: s.id + "　" + s.name }), el("span", { class: "hot-n", "data-count": s.id, text: countFor(s.id) || "" })]);
      b.style.top = (s.y / pg.h * 100) + "%";
      b.style.height = (s.h / pg.h * 100) + "%";
      b.style.width = "100%";
      wrap.appendChild(b);
    });
    box.appendChild(wrap);
  }
  function renderPanel() {
    var box = document.getElementById("panel");
    box.textContent = "";
    if (!ui.sec) {
      box.appendChild(el("p", { class: "empty", text: "左の目次か、中央の画面イメージの枠をクリックすると、ここで修正内容を入力できます。" }));
      return;
    }
    var id = ui.sec, x = secIndex[id];
    box.appendChild(el("div", { class: "pn-id", text: id + (id === ALL.id ? "" : "　" + pageOf(id)) }));
    box.appendChild(el("h2", { class: "pn-title", text: id === ALL.id ? ALL.name : x.sec.name }));
    if (x) {
      var pg = (id.indexOf("COM-") === 0) ? DATA.pages.filter(function (p) { return p.id === ui.page; })[0] : x.page;
      var sec = pg.sections.filter(function (s) { return s.id === id; })[0] || x.sec;
      box.appendChild(crop(sec, pg));
      box.appendChild(el("h3", { class: "pn-h", text: "この箇所の文言（直したい行をクリック）" }));
      var ul = el("ul", { class: "lines" });
      var dummies = x.sec.dummies;
      x.sec.lines.forEach(function (t) {
        var isD = dummies.some(function (d) { return t.indexOf(d) >= 0; });
        var b = el("button", { type: "button", class: "line-btn", onclick: function () { addAndFocus(id, isD ? KINDS[1] : KINDS[0], t); } },
          [isD ? el("span", { class: "tag-d", text: "ダミー" }) : null, t]);
        ul.appendChild(el("li", null, [b]));
      });
      box.appendChild(ul);
    } else {
      box.appendChild(el("p", { class: "hint", text: "ページを特定しない内容（サイト全体の方針、追加してほしいページ、ロゴの動きなど）はここに書きます。" }));
    }
    box.appendChild(el("p", { style: "margin-top:12px" }, [
      el("button", { type: "button", class: "btn", text: id === ALL.id ? "＋ 内容を追加する" : "＋ 画像・デザインなど、この箇所全体について追加する", onclick: function () { addAndFocus(id, id === ALL.id ? KINDS[4] : KINDS[5], ""); } })
    ]));
    var mine = state.rows.filter(function (r) { return r.sec === id; });
    box.appendChild(el("h3", { class: "pn-h", text: "この箇所の修正要求（" + mine.length + "件）" }));
    var rows = el("div", { class: "rows", id: "panel-rows" });
    mine.forEach(function (r, i) { rows.appendChild(rowCard(r, i + 1, false, renderPanel)); });
    if (!mine.length) rows.appendChild(el("p", { class: "hint", text: "まだありません。直したい文言をクリックして追加します。" }));
    box.appendChild(rows);
  }
  function addAndFocus(secId, kind, cur) {
    var dup = state.rows.filter(function (r) { return r.sec === secId && r.cur === cur && cur; })[0];
    if (dup) { toast("この文言はすでに追加済みです"); }
    else addRow(secId, kind, cur);
    renderPanel();
    var rows = document.querySelectorAll("#panel-rows .row");
    var last = rows[rows.length - 1];
    if (last) {
      var ta = last.querySelectorAll("textarea")[1];
      last.scrollIntoView({ block: "nearest" });
      if (ta) ta.focus();
    }
  }
  function selectSec(id, fromPreview) {
    var prevPage = ui.page;
    ui.sec = id;
    if (id !== ALL.id && id.indexOf("COM-") !== 0) ui.page = secIndex[id].page.id;
    if (ui.page === prevPage && document.getElementById("preview").firstChild) {
      // 同じページ内の選択は、画像を描き直さず、強調だけ更新する（スクロール位置を保つ）
      renderIndex(); renderPanel();
      document.querySelectorAll("#preview .hot").forEach(function (h) {
        h.setAttribute("aria-current", h.getAttribute("data-sec") === id ? "true" : "false");
      });
    } else {
      renderPick();
    }
    if (!fromPreview && id !== ALL.id) {
      var h = document.querySelector('#preview .hot[data-sec="' + id + '"]');
      if (h) h.scrollIntoView({ block: "center", behavior: "auto" });
    }
  }
  function renderPick() {
    renderIndex(); renderPreview(); renderPanel();
  }
  function refreshCounts() {
    document.querySelectorAll("[data-count]").forEach(function (n) {
      var c = countFor(n.getAttribute("data-count"));
      n.textContent = c || "";
    });
    var total = state.rows.length;
    document.getElementById("cnt-list").textContent = total || "";
    var answered = dummyOrder.filter(function (t) { var d = state.dummies[t]; return d && d.ans && d.ans !== ANS[0]; }).length;
    document.getElementById("cnt-dummy").textContent = answered ? answered + "/" + dummyOrder.length : "";
  }

  /* ---------- タブ2：ダミー値 ---------- */
  function renderDummy() {
    var v = document.getElementById("view-dummy");
    v.textContent = "";
    v.appendChild(el("h2", { class: "sec-h", text: "ダミー値の確認" }));
    v.appendChild(el("p", { class: "lead", text: "画面に出ている仮の値の一覧です。同じ値は1行にまとめています。正しい値を入れると、出てくるすべての箇所に反映します。このままでよいものは「このままでよい」を選んでください。" }));
    var tw = el("div", { class: "table-wrap" });
    var t = el("table", { class: "t" });
    t.appendChild(el("thead", null, [el("tr", null, ["仮の値（ダミー）", "出てくる箇所", "回答", "正しい値", "通信欄"].map(function (h) { return el("th", { text: h }); }))]));
    var tb = el("tbody");
    dummyOrder.forEach(function (txt) {
      var d = state.dummies[txt] || (state.dummies[txt] = { ans: ANS[0], val: "", note: "" });
      var tr = el("tr", { class: d.ans === ANS[2] || (d.ans === ANS[1] && d.val) ? "done" : "" });
      tr.appendChild(el("td", { class: "dm", text: txt }));
      var where = el("td", { class: "where" });
      var ids = dummyMap[txt];
      function link(sid) { return el("a", { href: "#", text: pageOf(sid) + "　" + secLabel(sid), onclick: function (e) { e.preventDefault(); switchTab("pick"); selectSec(sid); } }); }
      ids.slice(0, 3).forEach(function (sid) { where.appendChild(link(sid)); });
      if (ids.length > 3) {
        var more = el("details", null, [el("summary", { class: "hint", text: "ほか " + (ids.length - 3) + " 箇所" })]);
        ids.slice(3).forEach(function (sid) { more.appendChild(link(sid)); });
        where.appendChild(more);
      }
      tr.appendChild(where);
      var sel = selectEl(ANS, d.ans, function (val) { d.ans = val; save(); refreshCounts(); tr.className = (val === ANS[2] || (val === ANS[1] && d.val)) ? "done" : ""; });
      sel.setAttribute("aria-label", txt + " の回答");
      tr.appendChild(el("td", null, [sel]));
      var inp = el("input", { type: "text", "aria-label": txt + " の正しい値", oninput: function () {
        d.val = inp.value;
        if (inp.value && d.ans === ANS[0]) { d.ans = ANS[1]; sel.value = ANS[1]; }
        save(); refreshCounts(); tr.className = (d.ans === ANS[2] || (d.ans === ANS[1] && d.val)) ? "done" : "";
      } });
      inp.value = d.val;
      tr.appendChild(el("td", null, [inp]));
      var note = el("input", { type: "text", "aria-label": txt + " の通信欄", oninput: function () { d.note = note.value; save(); } });
      note.value = d.note;
      tr.appendChild(el("td", null, [note]));
      tb.appendChild(tr);
    });
    t.appendChild(tb); tw.appendChild(t); v.appendChild(tw);
  }

  /* ---------- タブ3：一覧・全体への連絡 ---------- */
  function renderList() {
    var v = document.getElementById("view-list");
    v.textContent = "";
    v.appendChild(el("h2", { class: "sec-h", text: "回答者" }));
    var who = el("div", { class: "who" });
    [["name", "お名前"], ["company", "屋号・事務所名"], ["date", "記入日"]].forEach(function (f) {
      var i = el("input", { type: f[0] === "date" ? "date" : "text", oninput: function () { state.who[f[0]] = i.value; save(); } });
      i.value = state.who[f[0]];
      who.appendChild(el("label", { class: "field" }, [el("span", { text: f[1] }), i]));
    });
    v.appendChild(who);
    v.appendChild(el("h2", { class: "sec-h", text: "全体への連絡（通信欄）" }));
    var msg = el("div", { class: "msg" });
    msg.appendChild(textField("ご要望・ご質問・お知らせ（自由に書いてください）", state.msg, 5, function (val) { state.msg = val; save(); }));
    v.appendChild(msg);

    v.appendChild(el("h2", { class: "sec-h", text: "修正要求一覧" }));
    var rows = sortedRows();
    var dum = dummyOrder.filter(function (t) { var d = state.dummies[t]; return d && d.ans !== ANS[0]; }).length;
    v.appendChild(el("div", { class: "summary" }, [
      el("span", null, ["修正要求　", el("b", { text: String(rows.length) }), " 件"]),
      el("span", null, ["ダミー値の回答　", el("b", { text: dum + " / " + dummyOrder.length }), " 件"])
    ]));
    if (!rows.length) v.appendChild(el("p", { class: "hint", text: "まだ修正要求はありません。「① ページから選ぶ」で追加してください。" }));
    var last = null, wrap = null, n = 0;
    rows.forEach(function (r) {
      var p = pageOf(r.sec);
      if (p !== last) { v.appendChild(el("h3", { class: "list-page", text: p })); wrap = el("div", { class: "rows" }); v.appendChild(wrap); last = p; }
      wrap.appendChild(rowCard(r, ++n, true, renderList));
    });
  }

  /* ---------- タブ切替 ---------- */
  function switchTab(name) {
    ui.tab = name;
    ["pick", "dummy", "list"].forEach(function (t) {
      document.getElementById("tab-" + t).setAttribute("aria-selected", String(t === name));
      document.getElementById("view-" + t).hidden = t !== name;
    });
    if (name === "pick") renderPick();
    if (name === "dummy") renderDummy();
    if (name === "list") renderList();
  }

  /* ---------- 書き出し・読み込み ---------- */
  function stamp() {
    var d = new Date();
    return d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2) + "-" + ("0" + d.getHours()).slice(-2) + ("0" + d.getMinutes()).slice(-2);
  }
  function download(name, mime, text, bom) {
    var blob = new Blob([bom ? "﻿" : "", text], { type: mime });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function flatRows() {
    var out = [], n = 0;
    sortedRows().forEach(function (r) {
      out.push([++n, r.sec, pageOf(r.sec), (secIndex[r.sec] ? secIndex[r.sec].sec.name : (r.sec === ALL.id ? ALL.name : "")), r.kind, r.cur, r.rev, r.note, r.status]);
    });
    dummyOrder.forEach(function (t) {
      var d = state.dummies[t];
      if (!d || d.ans === ANS[0]) return;
      var where = dummyMap[t].map(function (s) { return pageOf(s) + " " + secLabel(s); }).join(" / ");
      out.push([++n, "DUMMY", "ダミー値", where, "ダミーの差し替え（" + d.ans + "）", t, d.ans === ANS[2] ? "（このままでよい）" : d.val, d.note, STATUS[0]]);
    });
    return out;
  }
  var HEAD = ["No", "箇所ID", "ページ", "箇所", "種別", "現在の文言", "修正後", "通信欄", "対応状況"];
  function csvCell(s) { s = String(s == null ? "" : s); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function toCsv() {
    var lines = [HEAD].concat(flatRows());
    var meta = [["回答者", state.who.name, "屋号", state.who.company, "記入日", state.who.date], ["全体への連絡", state.msg]];
    return meta.concat([[]], lines).map(function (r) { return r.map(csvCell).join(","); }).join("\r\n");
  }
  function toText() {
    var t = "【縄野測量 ホームページ 修正要求】\n回答者：" + state.who.name + "　" + state.who.company + "　" + state.who.date + "\n";
    if (state.msg) t += "\n■全体への連絡\n" + state.msg + "\n";
    flatRows().forEach(function (r) {
      t += "\n[" + r[0] + "] " + r[2] + " / " + r[3] + "（" + r[1] + "）\n  種別：" + r[4] + "\n  現在：" + r[5] + "\n  修正後：" + r[6] + (r[7] ? "\n  通信欄：" + r[7] : "") + "\n";
    });
    return t;
  }
  function bind() {
    document.getElementById("btn-json").addEventListener("click", function () {
      var payload = { sheet: "nawano-review", version: DATA.version, generated: DATA.generated, savedAt: new Date().toISOString(), state: state };
      download("nawano-review-" + stamp() + ".json", "application/json", JSON.stringify(payload, null, 2));
      toast("ファイルに書き出しました。このファイルを制作担当へお送りください");
    });
    document.getElementById("btn-csv").addEventListener("click", function () {
      download("nawano-review-" + stamp() + ".csv", "text/csv", toCsv(), true);
      toast("CSVを書き出しました（Excelで開けます）");
    });
    document.getElementById("btn-copy").addEventListener("click", function () {
      var t = toText();
      function fb() {
        var ta = el("textarea", { style: "position:fixed;left:-9999px" }); ta.value = t; document.body.appendChild(ta); ta.select();
        var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
        ta.remove(); toast(ok ? "内容をコピーしました。メールなどに貼り付けてください" : "コピーできませんでした。書き出しをご利用ください");
      }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(function () { toast("内容をコピーしました。メールなどに貼り付けてください"); }, fb);
      else fb();
    });
    var fi = document.getElementById("file-import");
    document.getElementById("btn-import").addEventListener("click", function () { fi.click(); });
    fi.addEventListener("change", function () {
      var f = fi.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var o = JSON.parse(rd.result);
          var s = normalize(o.sheet === "nawano-review" ? o.state : o);
          if (!s) throw new Error("形式が違います");
          if (!confirm("いまの入力内容を、読み込んだファイルの内容に置き換えます。よろしいですか？")) return;
          state = s; save(); refreshCounts(); switchTab(ui.tab); toast("読み込みました");
        } catch (e) { alert("読み込めませんでした。このシートで書き出したJSONファイルを選んでください。"); }
        fi.value = "";
      };
      rd.readAsText(f);
    });
    document.querySelectorAll(".tabs button").forEach(function (b) {
      b.addEventListener("click", function () { switchTab(b.getAttribute("data-tab")); });
    });
  }

  /* ---------- 起動 ---------- */
  document.getElementById("ver").textContent = "対象：" + DATA.generated + " 時点のモック（版 " + DATA.version + "）　入力はこのブラウザに自動保存されます";
  bind();
  refreshCounts();
  setSave(state.rows.length || Object.keys(state.dummies).length ? "前回の入力を復元しました" : "");
  switchTab("pick");
})();
