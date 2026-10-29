// YogSetu — console chrome shared by the Teacher, Client and Admin dashboards:
// dark/light theme switch (remembered per browser), mobile sidebar toggle,
// top-bar logout, and mirroring the signed-in name/photo into the sidebar
// identity card. Page-specific data loading stays in each page's own script.
(function () {
  "use strict";
  var KEY = "ys-console-theme";
  var root = document.documentElement;

  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem(KEY, t); } catch (e) {}
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-theme-set") === t ? "true" : "false");
    });
  }
  setTheme(root.getAttribute("data-theme") || "dark");
  document.querySelectorAll("[data-theme-set]").forEach(function (b) {
    b.addEventListener("click", function () { setTheme(b.getAttribute("data-theme-set")); });
  });

  // Top-bar logout reuses the page's own logout link (which already calls the API).
  var cxLogout = document.getElementById("cxLogout");
  var logoutLink = document.getElementById("logoutLink");
  if (cxLogout && logoutLink) {
    cxLogout.addEventListener("click", function (e) { e.preventDefault(); logoutLink.click(); });
  }

  // Mobile sidebar (the admin page wires its own burger; the others opt in).
  var sidebar = document.getElementById("wsnSidebar");
  var backdrop = document.getElementById("wsnBackdrop");
  var burger = document.getElementById("wsnBurger");
  if (document.body.hasAttribute("data-cx-burger") && sidebar && backdrop && burger) {
    var close = function () { sidebar.classList.remove("open"); backdrop.classList.remove("open"); };
    burger.addEventListener("click", function () {
      sidebar.classList.toggle("open");
      backdrop.classList.toggle("open");
    });
    backdrop.addEventListener("click", close);
    sidebar.querySelectorAll("[data-section]").forEach(function (b) { b.addEventListener("click", close); });
  }

  // Mirror the header identity (filled in by the page after /api/auth/me) into the sidebar + top bar.
  var srcName = document.getElementById("headerName");
  var srcChip = document.getElementById("headerAvatarChip");
  function mirror() {
    var name = srcName ? srcName.textContent.trim() : "";
    document.querySelectorAll("[data-cx-name]").forEach(function (el) { if (name) el.textContent = name; });
    if (srcChip) {
      document.querySelectorAll("[data-cx-chip]").forEach(function (el) { el.innerHTML = srcChip.innerHTML; });
    }
  }
  if (window.MutationObserver) {
    var mo = new MutationObserver(mirror);
    if (srcName) mo.observe(srcName, { childList: true, characterData: true, subtree: true });
    if (srcChip) mo.observe(srcChip, { childList: true, characterData: true, subtree: true });
  }
  mirror();

  // Hide sidebar count badges while they read 0.
  function syncCounts() {
    document.querySelectorAll(".wsn-nav-item .count").forEach(function (c) {
      if (c.textContent.trim() === "0" || c.textContent.trim() === "") c.setAttribute("data-zero", "");
      else c.removeAttribute("data-zero");
    });
  }
  if (window.MutationObserver) {
    document.querySelectorAll(".wsn-nav-item .count").forEach(function (c) {
      new MutationObserver(syncCounts).observe(c, { childList: true, characterData: true, subtree: true });
    });
  }
  syncCounts();
})();
