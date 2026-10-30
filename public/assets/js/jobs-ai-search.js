// YogSetu — "Setu AI" job-search agent on /yoga-jobs.
// Reads a free-text city / PIN / style / budget ("Prenatal in Delhi", "226001",
// "online under 600"), shows a short agent "thinking" sequence, then drives the
// page's existing hero filter controls (#heroCity / #heroStyle / #heroMode and
// #heroSearchBtn handled by requirements.js) so nothing else has to change.
(function () {
  "use strict";
  var agent = document.getElementById("aiAgent");
  var form = document.getElementById("aiForm");
  var input = document.getElementById("aiInput");
  var msg = document.getElementById("aiMsg");
  var heroCity = document.getElementById("heroCity");
  var heroStyle = document.getElementById("heroStyle");
  var heroMode = document.getElementById("heroMode");
  var goBtn = document.getElementById("heroSearchBtn");
  if (!agent || !form || !input || !msg || !heroCity || !goBtn) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var KEY = "ysAiSearch";

  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
  function norm(s) { return String(s || "").toLowerCase(); }
  function opts(sel) {
    return Array.prototype.slice.call(sel.options).filter(function (o) { return o.value; })
      .map(function (o) { return { value: o.value, key: norm(o.value) }; });
  }
  var CITY_ALIAS = { bangalore: "bengaluru", gurgaon: "gurugram", bombay: "mumbai", "new delhi": "delhi", poona: "pune", calcutta: "kolkata", madras: "chennai" };
  // first three digits of an Indian PIN code -> city
  var PIN3 = {
    "110": "delhi", "122": "gurugram", "201": "noida", "226": "lucknow", "227": "lucknow", "208": "kanpur", "209": "kanpur",
    "400": "mumbai", "401": "mumbai", "410": "pune", "411": "pune", "412": "pune", "560": "bengaluru", "561": "bengaluru",
    "500": "hyderabad", "600": "chennai", "700": "kolkata", "302": "jaipur", "380": "ahmedabad", "462": "bhopal", "452": "indore", "160": "chandigarh"
  };
  var KNOWN_CITIES = ["delhi", "mumbai", "pune", "bengaluru", "hyderabad", "chennai", "kolkata", "lucknow", "kanpur", "jaipur", "ahmedabad", "bhopal", "indore", "chandigarh", "gurugram", "noida", "ghaziabad", "faridabad", "nagpur", "surat", "patna", "ranchi", "dehradun", "rishikesh", "varanasi", "agra", "goa", "kochi", "coimbatore", "visakhapatnam", "vadodara", "ludhiana", "amritsar", "raipur"];
  var KNOWN_STYLES = ["hatha", "ashtanga", "vinyasa", "prenatal", "therapeutic", "pranayama", "meditation", "corporate", "seniors", "kids", "power", "yin", "iyengar", "restorative"];
  var cities = opts(heroCity), styles = opts(heroStyle);

  function parse(q) {
    var s = norm(q), out = { raw: q, city: null, cityName: null, pin: null, style: null, online: false, budget: null, unknownCity: null };
    var pin = s.match(/\b[1-9]\d{5}\b/);
    if (pin) {
      out.pin = pin[0];
      var guess = PIN3[out.pin.slice(0, 3)];
      if (guess) {
        var hit = cities.filter(function (c) { return c.key === guess; })[0];
        if (hit) out.city = hit.value; else out.unknownCity = guess;
      }
    }
    Object.keys(CITY_ALIAS).forEach(function (k) { if (s.indexOf(k) !== -1) s = s.replace(k, CITY_ALIAS[k]); });
    if (!out.city) {
      var found = cities.filter(function (c) { return c.key !== "online" && new RegExp("\\b" + c.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(s); })[0];
      if (found) out.city = found.value;
    }
    if (!out.city && !out.unknownCity) {
      KNOWN_CITIES.forEach(function (k) { if (!out.unknownCity && new RegExp("\\b" + k + "\\b").test(s)) out.unknownCity = k; });
    }
    KNOWN_STYLES.forEach(function (k) { if (!out.styleWord && s.indexOf(k) !== -1) out.styleWord = k; });
    out.cityName = out.city;
    styles.forEach(function (st) {
      var first = st.key.split(/[\s&\/-]+/)[0];
      if (!out.style && (s.indexOf(st.key) !== -1 || (first.length > 3 && s.indexOf(first) !== -1))) out.style = st.value;
    });
    if (/\b(online|virtual|zoom|video call)\b/.test(s)) out.online = true;
    var b = s.match(/(?:under|below|less than|within|upto|up to|max)\s*(?:rs\.?|inr|\u20b9)?\s*(\d{3,5})/);
    if (b) out.budget = Number(b[1]);
    return out;
  }

  var typeTimer = null;
  function setMsg(html, typing) {
    clearInterval(typeTimer);
    msg.classList.remove("is-typing");
    if (!typing || reduce) { msg.innerHTML = '<span class="ai-msg-text" id="aiMsgText">' + html + "</span>"; return; }
    var tmp = document.createElement("div"); tmp.innerHTML = html;
    var plain = tmp.textContent, i = 0;
    msg.innerHTML = '<span class="ai-msg-text" id="aiMsgText"></span>';
    var el = document.getElementById("aiMsgText");
    msg.classList.add("is-typing");
    typeTimer = setInterval(function () {
      i += 2;
      if (i >= plain.length) { clearInterval(typeTimer); msg.classList.remove("is-typing"); el.innerHTML = html; return; }
      el.textContent = plain.slice(0, i);
    }, 18);
  }

  function think(steps, done) {
    var ul = document.createElement("ul"); ul.className = "ai-think";
    ul.innerHTML = steps.map(function (t) { return '<li><span class="d"></span><span>' + esc(t) + "</span></li>"; }).join("");
    clearInterval(typeTimer); msg.classList.remove("is-typing");
    msg.innerHTML = ""; msg.appendChild(ul);
    var lis = ul.querySelectorAll("li"), n = 0, gap = reduce ? 30 : 520;
    (function tick() {
      if (n > 0) { lis[n - 1].classList.remove("on"); lis[n - 1].classList.add("done"); }
      if (n >= lis.length) { setTimeout(done, reduce ? 0 : 220); return; }
      lis[n].classList.add("on"); n++; setTimeout(tick, gap);
    })();
  }

  function whereText(p) {
    if (p.online) return "online";
    if (p.city) return "in <b>" + esc(p.city) + "</b>" + (p.pin ? " (PIN " + esc(p.pin) + ")" : "");
    return "across India";
  }
  function summary(p, n) {
    var what = p.style ? esc(p.style) + " " : "";
    if (!n) return p.note ? "Try another city, or tap <b>Online under \u20b9600</b>." : "I couldn't find open " + what + "requirements " + whereText(p) + " right now. Try another city, or tap <b>Online under \u20b9600</b>.";
    return "Found <b>" + n + "</b> open " + what + "requirement" + (n === 1 ? "" : "s") + " " + whereText(p) + (p.budget ? " under \u20b9" + p.budget : "") + ". I've listed them below \u2193";
  }

  function run(q) {
    q = (q || "").trim();
    if (!q) { setMsg("Type a <strong>city</strong> or a 6-digit <strong>PIN code</strong> (like <b>226001</b>) and I'll search.", true); input.focus(); return; }
    var p = parse(q);
    if (!p.city && p.unknownCity && !p.pin) {
      var nm = p.unknownCity.charAt(0).toUpperCase() + p.unknownCity.slice(1);
      p.note = "There are no open requirements in " + nm + " yet \u2014 new ones are posted every day.";
    }
    if (p.pin && !p.city && !p.online) {
      p.note = p.unknownCity ? "No open requirements near PIN " + p.pin + " (" + p.unknownCity.charAt(0).toUpperCase() + p.unknownCity.slice(1) + ") yet." : "I don't recognise PIN " + p.pin + " yet.";
    }
    if (!p.pin && !p.city && !p.unknownCity && !p.style && !p.styleWord && !p.online && !p.budget) {
      setMsg("I couldn't spot a city, PIN or style in \u201c" + esc(q) + "\u201d. Try <b>Lucknow</b>, <b>110001</b> or <b>Prenatal in Delhi</b>.", true); return;
    }
    agent.classList.add("is-busy");
    var steps = ["Reading your search\u2026", p.pin ? "Locating PIN " + p.pin + "\u2026" : (p.city ? "Locating " + p.city + "\u2026" : "Checking all locations\u2026"), "Matching verified requirements\u2026"];
    think(steps, function () {
      sessionStorage.setItem(KEY, JSON.stringify({ q: q, p: p }));
      heroCity.value = p.online ? "Online" : (p.city || "");
      if (!heroCity.value && p.online) heroCity.value = "";
      heroStyle.value = p.style || "";
      var hasOnlineOpt = Array.prototype.some.call(heroCity.options, function (o) { return o.value === "Online"; });
      heroMode.value = p.online && !hasOnlineOpt ? "online" : "";
      var bm = document.getElementById("budgetMax"); if (bm) bm.value = p.budget ? String(p.budget) : "";
      var filterCity = document.getElementById("filterCity");
      var opt = heroCity.options[heroCity.selectedIndex];
      var willNavigate = !!(heroCity.value && opt && opt.getAttribute("data-url") && (!filterCity || heroCity.value !== filterCity.value));
      goBtn.click();
      setTimeout(function () {
        agent.classList.remove("is-busy");
        if (willNavigate) return; // heading to a city page; the agent reports the result after it loads
        var n = Number((document.getElementById("resultCount") || {}).textContent) || 0;
        setMsg((p.note ? esc(p.note) + " " : "") + summary(p, n), true);
        sessionStorage.removeItem(KEY);
      }, 60);
    });
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); run(input.value); });
  Array.prototype.forEach.call(document.querySelectorAll("#aiChips .ai-chip"), function (c) {
    c.addEventListener("click", function () { input.value = c.getAttribute("data-q"); run(input.value); });
  });

  // coming back after a city-page navigation: let the agent report what it found
  try {
    var saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (saved && saved.p) {
      sessionStorage.removeItem(KEY);
      input.value = saved.q;
      var n = Number((document.getElementById("resultCount") || {}).textContent) || 0;
      setMsg((saved.p.note ? esc(saved.p.note) + " " : "") + summary(saved.p, n), true);
    } else {
      setMsg(msg.querySelector(".ai-msg-text").innerHTML, true);
    }
  } catch (e) {}

  // rotating placeholder
  if (!reduce) {
    var ph = ["Enter city or PIN code\u2026", "Try \u201cLucknow\u201d", "Try \u201c226001\u201d", "Try \u201cHatha in Pune\u201d"], pi = 0;
    setInterval(function () { if (document.activeElement !== input && !input.value) { pi = (pi + 1) % ph.length; input.placeholder = ph[pi]; } }, 2600);
  }
})();
