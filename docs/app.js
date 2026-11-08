(function () {
  "use strict";
  var ROLES = window.ROLES, $ = function (id) { return document.getElementById(id); };
  var state = { variant: "new", role: null, startedAt: Date.now(), firstMessageSent: false };

  // Mirrors the event spec in experiment.md. In production this would call the analytics SDK.
  function track(name, props) {
    var p = Object.assign({ variant: state.variant }, props || {});
    var li = document.createElement("li");
    li.textContent = name + " " + JSON.stringify(p);
    $("event-log").prepend(li);
    while ($("event-log").children.length > 6) $("event-log").lastChild.remove();
  }

  function show(step) {
    ["step-role", "step-tasks", "step-chat"].forEach(function (id) { $(id).hidden = id !== step; });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderRoles() {
    var box = $("roles");
    box.innerHTML = "";
    ROLES.forEach(function (r) {
      var b = el("button");
      b.type = "button";
      b.appendChild(el("span", "icon", r.icon));
      b.appendChild(document.createTextNode(r.label));
      b.addEventListener("click", function () { pickRole(r.id); });
      box.appendChild(b);
    });
  }

  function pickRole(id, guess) {
    state.role = ROLES.find(function (r) { return r.id === id; });
    track("onboarding_role_selected", guess
      ? { role: id, source: "typed_intent", confidence: +guess.confidence.toFixed(2) }
      : { role: id, source: "button" });
    $("intent-guess").hidden = !guess;
    if (guess) $("intent-guess").textContent = "Looks like you're a " + state.role.label.toLowerCase() +
      " (" + Math.round(guess.confidence * 100) + "% confident), here are 3 tasks. Not right? Tap Change role.";
    $("tasks-title").textContent = "Three things a " + state.role.label.toLowerCase() + " can try now";
    var box = $("tasks");
    box.innerHTML = "";
    state.role.tasks.forEach(function (t, i) {
      var b = el("button", "task");
      b.type = "button";
      b.appendChild(el("strong", null, t.title));
      b.appendChild(el("span", null, t.hint));
      b.addEventListener("click", function () { openChat(); runTask(t, i); });
      box.appendChild(b);
    });
    track("starter_tasks_shown", { role: id, task_count: 3 });
    show("step-tasks");
  }

  function addMsg(who, text) {
    var m = el("div", "msg " + who, text);
    $("messages").appendChild(m);
    $("messages").scrollTop = $("messages").scrollHeight;
    return m;
  }

  function openChat() {
    $("messages").innerHTML = "";
    $("chips").innerHTML = "";
    $("input").value = "";
    if (state.variant === "old") {
      $("chat-step").textContent = "Old onboarding";
      $("back-tasks").hidden = true;
      var empty = el("div", "empty");
      empty.appendChild(el("h2", null, "How can I help you today?"));
      empty.appendChild(el("p", null, "Type anything below."));
      $("messages").appendChild(empty);
    } else {
      $("chat-step").textContent = "Step 3 of 3";
      $("back-tasks").hidden = false;
      state.role.tasks.forEach(function (t, i) {
        var c = el("button", null, t.title);
        c.type = "button";
        c.addEventListener("click", function () { runTask(t, i); });
        $("chips").appendChild(c);
      });
    }
    show("step-chat");
  }

  function reply(text, done) {
    var typing = addMsg("bot typing", "Thinking...");
    setTimeout(function () {
      typing.remove();
      addMsg("bot", text);
      if (done) done();
    }, 600);
  }

  function noteFirstMessage(source) {
    if (state.firstMessageSent) return;
    state.firstMessageSent = true;
    track("first_message_sent", { source: source, ms_since_start: Date.now() - state.startedAt });
  }

  function runTask(t, i) {
    var empty = $("messages").querySelector(".empty");
    if (empty) empty.remove();
    track("starter_task_clicked", { role: state.role.id, task_index: i });
    noteFirstMessage("starter_task");
    addMsg("user", t.prompt);
    reply(t.answer, function () { track("task_completed", { role: state.role.id, task_index: i }); });
  }

  function send(e) {
    e.preventDefault();
    var text = $("input").value.trim();
    if (!text) return;
    var empty = $("messages").querySelector(".empty");
    if (empty) empty.remove();
    $("input").value = "";
    noteFirstMessage("typed");
    track("message_sent", { source: "typed", length: text.length });
    addMsg("user", text);
    // Typed prompts get a generic canned reply: there is no model behind this demo.
    var match = state.role && state.variant === "new" && state.role.tasks.find(function (t) { return t.prompt === text; });
    reply(match ? match.answer : window.BLANK_ANSWER);
  }

  // Typed instead of tapping a role: guess the role with the on-page classifier.
  var MIN_CONFIDENCE = 0.4;
  function guessRole(e) {
    e.preventDefault();
    var text = $("intent-input").value.trim();
    if (!text || !window.Intent) return;
    var g = window.Intent.classify(window.Intent.model, text);
    if (g.known === 0 || g.confidence < MIN_CONFIDENCE) {
      $("intent-note").textContent = "Not sure which role fits that. Pick one above.";
      return;
    }
    $("intent-note").textContent = "";
    pickRole(g.label, g);
  }

  function setVariant(v) {
    state.variant = v;
    state.startedAt = Date.now();
    state.firstMessageSent = false;
    document.querySelectorAll(".toggle button").forEach(function (b) {
      b.setAttribute("aria-selected", String(b.dataset.variant === v));
    });
    $("event-log").innerHTML = "";
    track("onboarding_viewed", {});
    if (v === "old") { state.role = null; openChat(); }
    else { renderRoles(); show("step-role"); }
  }

  document.querySelectorAll(".toggle button").forEach(function (b) {
    b.addEventListener("click", function () { setVariant(b.dataset.variant); });
  });
  $("change-role").addEventListener("click", function () { show("step-role"); });
  $("back-tasks").addEventListener("click", function () { show("step-tasks"); });
  $("composer").addEventListener("submit", send);
  $("intent-form").addEventListener("submit", guessRole);
  $("input").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) send(e);
  });

  var start = new URLSearchParams(location.search).get("variant");
  setVariant(start === "old" ? "old" : "new");
  // Deep link for screenshots: ?role=analyst&task=0
  var qr = new URLSearchParams(location.search).get("role");
  if (start !== "old" && qr && ROLES.some(function (r) { return r.id === qr; })) {
    pickRole(qr);
    var qt = new URLSearchParams(location.search).get("task");
    if (qt !== null && state.role.tasks[+qt]) { openChat(); runTask(state.role.tasks[+qt], +qt); }
  }
})();
