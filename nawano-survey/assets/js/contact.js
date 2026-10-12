/* 縄野測量 — 問い合わせフォーム
   サーバーは使いません。入力内容を整形し、
   ①メールソフトを起動（mailto）②内容をコピー の2通りで窓口に届けます。 */
(function () {
  "use strict";

  var form = document.getElementById("contact-form");
  if (!form) return;

  var cfg = window.NAWANO || {};
  var to = cfg.email || "";
  var MAILTO_LIMIT = 1800; // メールソフトによっては長いリンクを開けないため

  var statusEl = document.getElementById("form-status");
  var composeBox = document.getElementById("compose");
  var composeText = document.getElementById("compose-text");

  var RULES = {
    company: { msg: "会社名を入力してください" },
    person: { msg: "ご担当者名を入力してください" },
    email: { msg: "メールアドレスを入力してください", format: "メールアドレスの形式を確認してください" },
    address: { msg: "物件の所在地を入力してください" },
    agree: { msg: "個人情報の取り扱いへの同意が必要です" },
  };

  // 希望納期は今日以降のみ選べるようにする
  var deadline = form.elements.deadline;
  if (deadline) {
    var t = new Date();
    deadline.min = t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate());
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function val(name) { return (form.elements[name].value || "").trim(); }

  function clearErrors() {
    Array.prototype.forEach.call(form.querySelectorAll(".field-error"), function (n) { n.remove(); });
    Array.prototype.forEach.call(form.querySelectorAll("[aria-invalid]"), function (n) {
      n.removeAttribute("aria-invalid");
      n.removeAttribute("aria-describedby");
    });
  }

  function showError(el, message) {
    var id = "err-" + el.name;
    var p = document.createElement("p");
    p.className = "field-error";
    p.id = id;
    p.textContent = message;
    var host = el.closest(".field") || el.parentNode;
    host.appendChild(p);
    el.setAttribute("aria-invalid", "true");
    el.setAttribute("aria-describedby", id);
  }

  function validate() {
    clearErrors();
    var firstBad = null;
    Object.keys(RULES).forEach(function (name) {
      var el = form.elements[name];
      var empty = el.type === "checkbox" ? !el.checked : !el.value.trim();
      var message = empty ? RULES[name].msg : "";
      if (!empty && name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) {
        message = RULES.email.format;
      }
      if (message) {
        showError(el, message);
        if (!firstBad) firstBad = el;
      }
    });
    if (firstBad) {
      firstBad.focus();
      setStatus("入力内容を確認してください。");
      return false;
    }
    return true;
  }

  function formatDeadline(v) {
    if (!v) return "未定";
    var p = v.split("-");
    return p[0] + "年" + Number(p[1]) + "月" + Number(p[2]) + "日";
  }

  function compose() {
    var type = form.elements.type.options[form.elements.type.selectedIndex].text;
    var kind = form.elements.kind.options[form.elements.kind.selectedIndex].text;
    var subject = "【ご相談】" + type + "（" + val("company") + "）";
    var lines = [
      "縄野測量 ご担当者様",
      "",
      "以下の内容で相談します。",
      "",
      "相談の種類：" + type,
      "会社名：" + val("company"),
      "ご担当者名：" + val("person"),
      "メール：" + val("email"),
      "電話：" + (val("tel") || "未記入"),
      "物件の所在地：" + val("address"),
      "物件の種別：" + kind,
      "面積の目安：" + (val("area") || "未記入"),
      "希望納期（決済日・契約日）：" + formatDeadline(val("deadline")),
      "",
      "相談内容：",
      val("message") || "（なし）",
    ];
    return { subject: subject, body: lines.join("\n") };
  }

  function setStatus(text) { statusEl.textContent = text; }

  function showCompose(m) {
    composeText.value = "件名：" + m.subject + "\n宛先：" + to + "\n\n" + m.body;
    composeBox.classList.add("is-shown");
  }

  function openMail(m) {
    var href =
      "mailto:" + to +
      "?subject=" + encodeURIComponent(m.subject) +
      "&body=" + encodeURIComponent(m.body.replace(/\n/g, "\r\n"));
    showCompose(m);
    if (href.length > MAILTO_LIMIT) {
      setStatus("内容が長いため、メールを自動作成できません。下の内容をコピーして " + to + " へお送りください。");
      return;
    }
    setStatus("メールソフトを起動しています。起動しない場合は、下の内容をコピーして " + to + " へお送りください。");
    window.location.href = href;
  }

  function copyText(m) {
    showCompose(m);
    var text = composeText.value;
    function fallback() {
      composeText.focus();
      composeText.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      setStatus(ok
        ? "内容をコピーしました。メールに貼り付けて " + to + " へお送りください。"
        : "自動でコピーできませんでした。下の内容を選択してコピーしてください。");
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        setStatus("内容をコピーしました。メールに貼り付けて " + to + " へお送りください。");
      }, fallback);
    } else {
      fallback();
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (validate()) openMail(compose());
  });

  var copyBtn = document.getElementById("copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      if (validate()) copyText(compose());
    });
  }
})();
