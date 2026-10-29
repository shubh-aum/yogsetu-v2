// YogSetu — session-aware header. Runs on every page: checks whether the
// visitor is logged in (GET /api/auth/me) and, if so, swaps the header's
// "Log in / Sign up" for an account icon + dropdown (Dashboard / Log out),
// and does the same inside the mobile menu. Self-contained — doesn't touch
// the burger/mobile-menu toggle logic (site.js or each page's own inline
// version), so it's safe to load on every page regardless of which of those
// two that page uses.
(function () {
  "use strict";

  function dashboardUrlFor(role) {
    if (role === "admin" || role === "subadmin") return "/admin-dashboard";
    if (role === "teacher") return "/teacher-dashboard";
    return "/client-dashboard";
  }

  function doLogout() {
    fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
      .then(function () { window.location.href = "/"; })
      .catch(function () { window.location.href = "/"; });
  }

  function applyLoggedInState(user) {
    var dashUrl = dashboardUrlFor(user.role);

    // Desktop header: replace Log in / Sign up with an account icon + dropdown.
    document.querySelectorAll(".header-actions").forEach(function (actions) {
      if (actions.querySelector(".account-menu")) return;
      var loginLink = actions.querySelector('a[href="/login"]');
      var signupLink = actions.querySelector('a[href="/signup"]');
      if (loginLink) loginLink.style.display = "none";
      if (signupLink) signupLink.style.display = "none";

      var wrap = document.createElement("div");
      wrap.className = "account-menu";
      var initial = (user.email || "U").charAt(0).toUpperCase();
      wrap.innerHTML =
        '<button type="button" class="account-menu-btn" aria-haspopup="true" aria-expanded="false" aria-label="Account menu">' +
          '<span class="account-menu-avatar">' + initial + "</span>" +
        "</button>" +
        '<div class="account-menu-panel" role="menu">' +
          '<div class="account-menu-email">' + user.email + "</div>" +
          '<a href="' + dashUrl + '" role="menuitem">Dashboard</a>' +
          '<button type="button" class="account-menu-logout" role="menuitem">Log out</button>' +
        "</div>";
      actions.appendChild(wrap);

      var btn = wrap.querySelector(".account-menu-btn");
      var panel = wrap.querySelector(".account-menu-panel");
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = panel.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      document.addEventListener("click", function (e) {
        if (!wrap.contains(e.target)) {
          panel.classList.remove("open");
          btn.setAttribute("aria-expanded", "false");
        }
      });
      wrap.querySelector(".account-menu-logout").addEventListener("click", doLogout);
    });

    // Mobile menu: swap the Log in / Sign up links for Dashboard / Log out.
    document.querySelectorAll(".mobile-menu").forEach(function (menu) {
      var loginA = menu.querySelector('a[href="/login"]');
      var signupA = menu.querySelector('a[href="/signup"]');
      if (loginA) {
        loginA.textContent = "Dashboard";
        loginA.setAttribute("href", dashUrl);
      }
      if (signupA) {
        signupA.textContent = "Log out";
        signupA.setAttribute("href", "#");
        signupA.addEventListener("click", function (e) {
          e.preventDefault();
          doLogout();
        });
      }
    });
  }

  function init() {
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.user) applyLoggedInState(data.user);
      })
      .catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
