// YogSetu — Browse Teachers page: header search panel, style strip, live
// filtering, sort, active-filter pills and empty state, over category rows
// (one per yoga style) that alternate photo left/right and slide between
// teachers when a category has more than one.
(function () {
  "use strict";

  var grid = document.getElementById("teacherGrid");
  if (!grid) return; // not on this page

  var cards = Array.prototype.slice.call(grid.querySelectorAll(".tcard"));
  var categoryRows = Array.prototype.slice.call(grid.querySelectorAll(".category-row"));
  var resultsBar = document.getElementById("resultsBar");
  var countEl = document.getElementById("resultCount");
  var emptyState = document.getElementById("emptyState");
  var activeFiltersEl = document.getElementById("activeFilters");

  var citySelect = document.getElementById("filterCity");
  var styleChecks = Array.prototype.slice.call(document.querySelectorAll(".style-filter"));
  var certChecks = Array.prototype.slice.call(document.querySelectorAll(".cert-filter"));
  var expRadios = Array.prototype.slice.call(document.querySelectorAll(".exp-filter"));
  var modeChecks = Array.prototype.slice.call(document.querySelectorAll(".mode-filter"));
  var priceMin = document.getElementById("priceMin");
  var priceMax = document.getElementById("priceMax");
  var sortSelect = document.getElementById("sortSelect");
  var clearBtn = document.getElementById("clearFiltersBtn");
  var emptyClearBtn = document.getElementById("emptyClearBtn");

  var heroCity = document.getElementById("heroCity");
  var heroStyle = document.getElementById("heroStyle");
  var heroMode = document.getElementById("heroMode");
  var heroSearchBtn = document.getElementById("heroSearchBtn");
  var chipButtons = Array.prototype.slice.call(document.querySelectorAll("[data-chip-filter]"));
  var stylePills = Array.prototype.slice.call(document.querySelectorAll(".style-pill"));

  function currentFilters() {
    return {
      city: citySelect ? citySelect.value : "",
      styles: styleChecks.filter(function (c) { return c.checked; }).map(function (c) { return c.value; }),
      certs: certChecks.filter(function (c) { return c.checked; }).map(function (c) { return c.value; }),
      exp: (expRadios.filter(function (r) { return r.checked; })[0] || {}).value || "",
      modes: modeChecks.filter(function (c) { return c.checked; }).map(function (c) { return c.value; }),
      priceMin: priceMin && priceMin.value ? Number(priceMin.value) : null,
      priceMax: priceMax && priceMax.value ? Number(priceMax.value) : null,
    };
  }

  function cardMatches(card, f) {
    var cityOk = !f.city || f.city === "All cities" || card.dataset.city === f.city;
    var cardStyles = (card.dataset.styles || "").split(",");
    var stylesOk = !f.styles.length || f.styles.some(function (s) { return cardStyles.indexOf(s) !== -1; });
    var cardCerts = (card.dataset.certs || "").split(",");
    var certsOk = !f.certs.length || f.certs.some(function (c) { return cardCerts.indexOf(c) !== -1; });
    var expOk = !f.exp || card.dataset.exp === f.exp;
    var cardMode = card.dataset.mode || "";
    var modesOk = !f.modes.length || f.modes.indexOf(cardMode) !== -1 || cardMode === "hybrid";
    var price = Number(card.dataset.price || 0);
    var minOk = f.priceMin === null || price >= f.priceMin;
    var maxOk = f.priceMax === null || price <= f.priceMax;
    return cityOk && stylesOk && certsOk && expOk && modesOk && minOk && maxOk;
  }

  function renderActiveFilters(f) {
    if (!activeFiltersEl) return;
    activeFiltersEl.innerHTML = "";
    var pills = [];

    if (f.city && f.city !== "All cities") pills.push({ label: f.city, clear: function () { citySelect.value = "All cities"; } });
    f.styles.forEach(function (s) {
      pills.push({ label: s, clear: function () {
        styleChecks.forEach(function (c) { if (c.value === s) c.checked = false; });
        stylePills.forEach(function (p) { if (p.dataset.style === s) p.classList.remove("is-active"); });
      }});
    });
    f.certs.forEach(function (c) {
      pills.push({ label: c, clear: function () {
        certChecks.forEach(function (chk) { if (chk.value === c) chk.checked = false; });
      }});
    });
    if (f.exp) pills.push({ label: f.exp + " yrs", clear: function () {
      expRadios.forEach(function (r) { r.checked = false; });
    }});
    f.modes.forEach(function (m) {
      pills.push({ label: m === "online" ? "Online" : "In-studio", clear: function () {
        modeChecks.forEach(function (chk) { if (chk.value === m) chk.checked = false; });
      }});
    });
    if (f.priceMin || f.priceMax) {
      pills.push({ label: "₹" + (f.priceMin || 0) + "–" + (f.priceMax || "∞"), clear: function () {
        if (priceMin) priceMin.value = "";
        if (priceMax) priceMax.value = "";
      }});
    }

    activeFiltersEl.classList.toggle("is-empty", pills.length === 0);
    pills.forEach(function (p) {
      var pill = document.createElement("span");
      pill.className = "afilter-pill";
      pill.innerHTML = '<span>' + p.label + '</span><button type="button" aria-label="Remove filter"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
      pill.querySelector("button").addEventListener("click", function () {
        p.clear();
        applyFilters();
      });
      activeFiltersEl.appendChild(pill);
    });
    if (pills.length) {
      var clear = document.createElement("button");
      clear.type = "button";
      clear.className = "afilter-clear";
      clear.textContent = "Clear all";
      clear.addEventListener("click", clearAllFilters);
      activeFiltersEl.appendChild(clear);
    }
  }

  function sortWithin(track, mode) {
    var group = Array.prototype.slice.call(track.querySelectorAll(".tcard"));
    var sorted = group.sort(function (a, b) {
      if (mode === "rating") return Number(b.dataset.rating) - Number(a.dataset.rating);
      if (mode === "price-asc") return Number(a.dataset.price) - Number(b.dataset.price);
      if (mode === "price-desc") return Number(b.dataset.price) - Number(a.dataset.price);
      if (mode === "experience") return Number(b.dataset.years) - Number(a.dataset.years);
      if (mode === "today") return (b.dataset.availToday === "1" ? 1 : 0) - (a.dataset.availToday === "1" ? 1 : 0);
      return 0; // Recommended = source order
    });
    sorted.forEach(function (c) { track.appendChild(c); });
  }

  function applySort() {
    var mode = sortSelect ? sortSelect.value : "recommended";
    categoryRows.forEach(function (row) { sortWithin(row.querySelector(".category-slider"), mode); });
  }

  function applyFilters() {
    var f = currentFilters();
    var visibleCount = 0;
    cards.forEach(function (card) {
      var match = cardMatches(card, f);
      card.classList.toggle("thidden", !match);
      if (match) visibleCount++;
    });
    categoryRows.forEach(function (row) {
      var visibleInRow = row.querySelectorAll(".tcard:not(.thidden)").length;
      row.classList.toggle("is-empty", visibleInRow === 0);
    });
    if (countEl) countEl.textContent = visibleCount;
    if (emptyState) emptyState.classList.toggle("is-visible", visibleCount === 0);
    grid.style.display = visibleCount === 0 ? "none" : "";
    renderActiveFilters(f);
    applySort();
  }

  function clearAllFilters() {
    if (citySelect) citySelect.value = "All cities";
    styleChecks.forEach(function (c) { c.checked = false; });
    certChecks.forEach(function (c) { c.checked = c.value === "Verified"; });
    expRadios.forEach(function (r) { r.checked = false; });
    modeChecks.forEach(function (c) { c.checked = false; });
    if (priceMin) priceMin.value = "";
    if (priceMax) priceMax.value = "";
    stylePills.forEach(function (p) { p.classList.remove("is-active"); });
    applyFilters();
  }

  [citySelect, priceMin, priceMax, sortSelect].forEach(function (el) {
    if (el) el.addEventListener("change", applyFilters);
  });
  styleChecks.concat(certChecks).concat(modeChecks).concat(expRadios).forEach(function (el) {
    el.addEventListener("change", applyFilters);
  });
  if (clearBtn) clearBtn.addEventListener("click", clearAllFilters);
  if (emptyClearBtn) emptyClearBtn.addEventListener("click", clearAllFilters);

  function scrollToResults() {
    if (resultsBar) resultsBar.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function checkStyleValue(value, on) {
    styleChecks.forEach(function (c) { if (c.value === value) c.checked = on; });
  }

  // Header search icon — toggles the dropdown search panel (video hero has no form of its own)
  var headerSearchBtn = document.getElementById("headerSearchBtn");
  var headerSearchPanel = document.getElementById("headerSearchPanel");
  function closeSearchPanel() {
    if (!headerSearchPanel) return;
    headerSearchPanel.classList.remove("is-open");
    if (headerSearchBtn) headerSearchBtn.setAttribute("aria-expanded", "false");
  }
  if (headerSearchBtn && headerSearchPanel) {
    headerSearchBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = headerSearchPanel.classList.toggle("is-open");
      headerSearchBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    headerSearchPanel.addEventListener("click", function (e) { e.stopPropagation(); });
    document.addEventListener("click", closeSearchPanel);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSearchPanel(); });
  }

  // Hero search bar — copies its selections into the real filter controls
  if (heroSearchBtn) {
    heroSearchBtn.addEventListener("click", function () {
      if (citySelect && heroCity && heroCity.value) citySelect.value = heroCity.value;
      if (heroStyle && heroStyle.value) {
        styleChecks.forEach(function (c) { c.checked = false; });
        checkStyleValue(heroStyle.value, true);
        stylePills.forEach(function (p) { p.classList.toggle("is-active", p.dataset.style === heroStyle.value); });
      }
      if (heroMode && heroMode.value) {
        modeChecks.forEach(function (c) { c.checked = c.value === heroMode.value; });
      }
      applyFilters();
      closeSearchPanel();
      scrollToResults();
    });
  }

  // Quick chips — one-tap common searches
  chipButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var mode = btn.dataset.chipFilter;
      if (mode === "online") {
        modeChecks.forEach(function (c) { c.checked = c.value === "online"; });
      } else if (mode === "budget") {
        if (priceMax) priceMax.value = "600";
      } else if (mode === "today") {
        if (sortSelect) sortSelect.value = "recommended";
        categoryRows.forEach(function (row) { sortWithin(row.querySelector(".category-slider"), "today"); });
      }
      applyFilters();
      closeSearchPanel();
      scrollToResults();
    });
  });

  // Style strip — click to toggle as a filter
  stylePills.forEach(function (pill) {
    pill.addEventListener("click", function () {
      var value = pill.dataset.style;
      var willActivate = !pill.classList.contains("is-active");
      stylePills.forEach(function (p) { p.classList.remove("is-active"); });
      styleChecks.forEach(function (c) { c.checked = false; });
      if (willActivate) {
        pill.classList.add("is-active");
        checkStyleValue(value, true);
      }
      applyFilters();
      scrollToResults();
    });
  });

  // Initial render
  applyFilters();

  // ---- Per-category slider (only rows with more than one teacher get nav buttons) ----
  function initCategorySlider(row) {
    var track = row.querySelector(".category-slider");
    var prev = row.querySelector(".cat-prev");
    var next = row.querySelector(".cat-next");
    if (!track || !prev || !next) return;

    var sync = function () {
      var max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
    };
    prev.addEventListener("click", function () { track.scrollBy({ left: -track.clientWidth, behavior: "smooth" }); });
    next.addEventListener("click", function () { track.scrollBy({ left: track.clientWidth, behavior: "smooth" }); });
    track.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();
  }

  categoryRows.forEach(initCategorySlider);

  // ---- Hero featured-teachers avatar strip ----
  var avatarRail = document.getElementById("heroAvatarRail");
  var avatarNext = document.getElementById("heroAvatarNext");
  if (avatarRail && avatarNext) {
    avatarNext.addEventListener("click", function () {
      var atEnd = avatarRail.scrollLeft >= avatarRail.scrollWidth - avatarRail.clientWidth - 2;
      avatarRail.scrollBy({ left: atEnd ? -avatarRail.scrollWidth : 220, behavior: "smooth" });
    });
  }
})();
