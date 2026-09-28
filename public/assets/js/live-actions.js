// YogSetu — live actions on the server-rendered teacher profile and job pages:
//   • post a public comment on a teacher profile        (POST /api/teachers/:id/comments)
//   • ask a teacher a question                          (POST /api/teachers/:id/questions)
//   • send a connection request to a teacher            (POST /api/connections)
//   • apply to a job requirement                        (POST /api/requirements/:id/apply)
// Visitors who are not logged in (or have the wrong role) fall through to the
// normal sign-up link, exactly as the buttons behaved before.
(function () {
  "use strict";

  function request(path, body) {
    return fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) { var err = new Error(data.error || "Something went wrong. Please try again."); err.status = res.status; throw err; }
        return data;
      });
    });
  }

  var mePromise = null;
  function me() {
    if (!mePromise) {
      mePromise = fetch("/api/auth/me", { credentials: "same-origin" })
        .then(function (r) { return r.json(); })
        .then(function (d) { return d.user || null; })
        .catch(function () { return null; });
    }
    return mePromise;
  }

  // ---- toast ----
  var toastEl = null, toastTimer = null;
  function toast(text, isError) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      toastEl.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);z-index:500;max-width:min(92vw,460px);padding:13px 20px;border-radius:14px;font:600 14px/1.4 Inter,sans-serif;color:#fff;box-shadow:0 18px 40px -16px rgba(0,0,0,.5);opacity:0;transition:opacity .25s ease,transform .25s ease;pointer-events:none;";
      document.body.appendChild(toastEl);
    }
    toastEl.style.background = isError ? "#B23A3A" : "#1A1A18";
    toastEl.textContent = text;
    toastEl.style.opacity = "1";
    toastEl.style.transform = "translateX(-50%) translateY(0)";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.style.opacity = "0";
      toastEl.style.transform = "translateX(-50%) translateY(20px)";
    }, 4200);
  }

  function setMsg(el, text, kind) {
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || "";
    el.classList.toggle("is-error", kind === "error");
    el.classList.toggle("is-ok", kind === "ok");
  }

  // ---------------------------------------------------------------- comments
  var commentForm = document.getElementById("tpCommentForm");
  var feed = document.getElementById("tpCommentFeed");
  if (commentForm && feed) {
    var COLORS = ["var(--marigold)", "var(--pine)", "var(--sage)", "var(--marigold-deep)"];
    var msg = document.getElementById("tpCommentMsg");
    var submitBtn = commentForm.querySelector("button[type=submit]");
    var nameInput = document.getElementById("tpCommentName");
    try { if (nameInput && !nameInput.value) nameInput.value = window.localStorage.getItem("yogsetu:commenter") || ""; } catch (e) { /* storage unavailable */ }

    commentForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = nameInput.value.trim();
      var body = document.getElementById("tpCommentText").value.trim();
      if (!name || !body) return;
      submitBtn.disabled = true;
      setMsg(msg, "", "");
      request("/api/teachers/" + commentForm.getAttribute("data-teacher-id") + "/comments", {
        name: name, body: body, website: commentForm.elements.website ? commentForm.elements.website.value : "",
      }).then(function (data) {
        var c = data.comment;
        var item = document.createElement("div");
        item.className = "tp-feed-item is-new";
        var avatar = document.createElement("span");
        avatar.className = "tp-feed-avatar";
        avatar.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
        avatar.textContent = (c.name || "?").trim().charAt(0).toUpperCase();
        var bodyEl = document.createElement("div");
        bodyEl.className = "tp-feed-body";
        var top = document.createElement("div");
        top.className = "tp-feed-top";
        var nm = document.createElement("span"); nm.className = "tp-feed-name"; nm.textContent = c.name;
        var tm = document.createElement("span"); tm.className = "tp-feed-time"; tm.textContent = "Just now";
        top.appendChild(nm); top.appendChild(tm);
        var p = document.createElement("p"); p.textContent = c.body;
        bodyEl.appendChild(top); bodyEl.appendChild(p);
        item.appendChild(avatar); item.appendChild(bodyEl);
        feed.insertBefore(item, feed.firstChild);
        try { window.localStorage.setItem("yogsetu:commenter", name); } catch (err) { /* ignore */ }
        commentForm.reset();
        if (nameInput) nameInput.value = name;
        setMsg(msg, "Thanks — your comment is live.", "ok");
      }).catch(function (err) {
        setMsg(msg, err.message, "error");
      }).then(function () { submitBtn.disabled = false; });
    });
  }

  // --------------------------------------------------------------- questions
  var askForm = document.getElementById("tpAskForm");
  if (askForm) {
    var askMsg = document.getElementById("tpAskMsg");
    askForm.addEventListener("submit", function (e) {
      var input = askForm.elements.q;
      var question = input ? input.value.trim() : "";
      e.preventDefault();
      me().then(function (user) {
        if (!user || user.role !== "client") {
          // not a logged-in client: same behaviour as before — go to sign-up
          window.location.href = "/signup?role=client" + (question ? "&q=" + encodeURIComponent(question) : "");
          return null;
        }
        if (question.length < 5) { setMsg(askMsg, "Please type your question first.", "error"); return null; }
        return request("/api/teachers/" + askForm.getAttribute("data-teacher-id") + "/questions", { question: question })
          .then(function () {
            input.value = "";
            setMsg(askMsg, "Question sent — it will appear here once the teacher answers.", "ok");
          });
      }).catch(function (err) { setMsg(askMsg, err.message, "error"); });
    });
  }

  // ------------------------------------------------------ connection request
  Array.prototype.forEach.call(document.querySelectorAll("[data-connect]"), function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var id = btn.getAttribute("data-connect");
      me().then(function (user) {
        if (!user) { window.location.href = btn.getAttribute("href") || "/signup?role=client"; return null; }
        if (user.role !== "client") { toast("Log in with a client account to send a connection request.", true); return null; }
        return request("/api/connections", { teacher_user_id: Number(id) }).then(function () {
          toast("Request sent — the teacher will get back to you.", false);
          Array.prototype.forEach.call(document.querySelectorAll("[data-connect]"), function (b) {
            b.setAttribute("aria-disabled", "true");
            b.style.pointerEvents = "none";
            b.style.opacity = ".7";
            if (b.firstChild && b.firstChild.nodeType === 3) b.firstChild.nodeValue = "Request sent ✓ ";
          });
        });
      }).catch(function (err) { toast(err.message, true); });
    });
  });

  // ---------------------------------------------------------- job application
  Array.prototype.forEach.call(document.querySelectorAll("[data-apply]"), function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var id = btn.getAttribute("data-apply");
      var msgEl = document.getElementById("rdApplyMsg");
      me().then(function (user) {
        if (!user) { window.location.href = btn.getAttribute("href") || "/signup?role=teacher"; return null; }
        if (user.role !== "teacher") {
          var t = "Log in with a teacher account to apply to this requirement.";
          setMsg(msgEl, t, "error"); toast(t, true);
          return null;
        }
        return request("/api/requirements/" + id + "/apply").then(function () {
          setMsg(msgEl, "Application sent — the client will review it and respond.", "ok");
          toast("Application sent.", false);
          Array.prototype.forEach.call(document.querySelectorAll("[data-apply]"), function (b) {
            b.setAttribute("aria-disabled", "true");
            b.style.pointerEvents = "none";
            b.style.opacity = ".7";
          });
        });
      }).catch(function (err) { setMsg(msgEl, err.message, "error"); toast(err.message, true); });
    });
  });
})();
