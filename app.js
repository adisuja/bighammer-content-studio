/* app.js: BigHammer batch-3 review studio. Renders every post inside an iPhone LinkedIn iOS feed
   (via core.js + linkedin.js) with a review layer: Glenn / BigHammer team approvals and feedback,
   persisted in localStorage and shareable as a link (#r=...). No backend. */
(function () {
  const C = window.CORE, esc = C.esc, S = window.STUDIO;
  const HASH = location.hash; // captured before core.js boot strips it
  const LI_I = () => window.LI.I;
  window.RENDER = { screen: () => "", text: () => "" }; // core.js shell needs a renderer; we render ourselves

  /* ---------- review state: an append-only event log ----------
     Every approval and every feedback line is an event {id,t,post,kind,name,...}. Events live in
     localStorage and, when S.sync_url is set, in a shared Google Sheet (Apps Script web app) so every
     reviewer sees every other reviewer's feed. Share links carry the local log as a fallback. */
  const KEY = "bh-review-events-v3", NAMEKEY = "bh-reviewer-name", SYNC = S.sync_url || "";
  let EV = loadEv();
  function loadEv() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
  function saveEv() { localStorage.setItem(KEY, JSON.stringify(EV)); tally(); }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function merge(list) { const have = new Set(EV.map(e => e.id)); let n = 0; (list || []).forEach(e => { if (e && e.id && !have.has(e.id)) { EV.push(e); have.add(e.id); n++; } }); EV.sort((a, b) => a.t.localeCompare(b.t)); return n; }
  const comments = (post) => EV.filter(e => e.post === post && e.kind === "comment");
  function appr(post, role) { const l = EV.filter(e => e.post === post && e.kind === "approve" && e.role === role); return l.length ? l[l.length - 1] : null; }
  const rv = (id) => { const g = appr(id, "glenn"), t = appr(id, "team"); return { glenn: !!(g && g.value), team: !!(t && t.value), g, t }; };
  const fmtT = (t) => new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  let syncState = SYNC ? "connecting" : "local";
  async function push(e) {
    if (!SYNC) return;
    try { await fetch(SYNC, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(e) }); syncState = "live"; }
    catch { syncState = "offline"; }
    syncBadge();
  }
  async function pull() {
    if (!SYNC) return;
    try {
      const r = await fetch(SYNC + (SYNC.includes("?") ? "&" : "?") + "t=" + Date.now()); const remote = await r.json();
      const ids = new Set(remote.map(x => x.id)); const mine = EV.filter(e => !ids.has(e.id));
      const n = merge(remote); saveEv(); syncState = "live";
      mine.forEach(push);                       // retry anything that never reached the sheet
      if (n) refreshReviews();
    } catch { syncState = "offline"; }
    syncBadge();
  }
  function syncBadge() { const el = document.getElementById("sync"); if (!el) return; const m = { live: ["Shared · live", "ok"], connecting: ["Connecting…", ""], offline: ["Offline · saved here", "warn"], local: ["Saved in this browser", "warn"] }[syncState]; el.textContent = m[0]; el.className = "syncb " + m[1]; }
  function add(e) { e.id = uid(); e.t = new Date().toISOString(); EV.push(e); saveEv(); push(e); return e; }
  const enc = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const dec = (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))));

  /* ---------- helpers ---------- */
  const prof = (id) => S.profiles.find(p => p.id === id);
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function when(p) {
    const d = new Date(p.date + "T12:00:00Z");
    const tz = prof(p.profile).tz === "ET" ? "ET (New York)" : "UK time";
    return { day: `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]} 2026`, time: `${p.time} ${tz}` };
  }
  const avatar = (pr, size) => `<span class="av${pr.kind === "company" ? " sq" : ""}" style="width:${size}px;height:${size}px;border-radius:${pr.kind === "company" ? "6px" : "50%"};background:#ccc">${pr.avatar_ok ? `<img src="${esc(pr.avatar)}" alt="">` : `<b style="color:#fff;font-size:${Math.round(size * .4)}px">${esc(pr.name[0])}</b>`}</span>`;

  /* ---------- LinkedIn iOS post ---------- */
  function mediaHtml(p) {
    const m = p.media || {};
    if (m.type === "image") {
      return `<div class="li-imgpost${m.tall ? " tall" : ""}"><img src="${esc(m.files[0])}" alt="${esc(p.id)}" data-lb="${esc(m.files[0])}" data-lb-caption="${esc(p.id)} · ${esc(p.idea)}"></div>`;
    }
    if (m.type === "carousel") {
      const g = "car-" + p.key, n = m.files.length;
      const slides = m.files.map((f, i) => `<div class="li-slide"><img src="${esc(f)}" alt="${esc(p.id)} page ${i + 1}" data-lb="${esc(f)}" data-lb-group="${g}" data-lb-caption="${esc(m.title || p.id)} · page ${i + 1} of ${n}"></div>`).join("");
      return `<div class="li-doc"><div class="li-doc-head"><span class="li-doc-title">${esc(m.title || p.idea)}</span><span class="li-doc-pages">${n} pages</span></div>
        <div class="li-doc-view"><div class="li-slides" data-pages="${n}">${slides}</div><span class="li-pg">1 / ${n}</span><span class="li-exp" title="View full screen">${LI_I().expand}</span><button class="li-arr prev" data-dir="-1" title="Previous slide">‹</button><button class="li-arr next" data-dir="1" title="Next slide">›</button></div></div>`;
    }
    if (m.type === "poll") {
      return `<div class="li-poll"><div class="li-poll-q">${esc(m.question)}</div><div class="li-poll-s">The author can see how you vote. <span style="color:#0a66c2;font-weight:600">Learn more</span></div>${m.options.map(o => `<button class="li-poll-o">${esc(o)}</button>`).join("")}<div class="li-poll-f">0 votes · 1w left</div></div>`;
    }
    if (m.type === "pending") return `<div class="wipbox">Media in production</div>`;
    return "";
  }
  function postText(p) {
    const html = C.rich(p.text, "li-link").replace(/(^|\s)(#[A-Za-z0-9_]+)/g, '$1<span class="li-tag">$2</span>').replace(/\n/g, "<br>");
    return `<div class="li-text clamp">${html}<span class="li-more" title="Show the full post">…more</span></div>`;
  }
  function commentHtml(p, pr) {
    if (!p.first_comment) return "";
    const txt = C.rich(p.first_comment, "li-link").replace(/\n/g, "<br>");
    return `<div class="li-cmts"><div class="li-cm-sort">Most relevant ▾</div><div class="li-cm">${avatar(pr, 32)}<div class="li-cm-b"><div class="li-cm-bubble"><div class="li-cm-n">${esc(pr.name)} <span class="li-auth">Author</span></div><div class="li-cm-h">${esc(pr.headline)}</div><div class="li-cm-t">${txt}</div></div><div class="li-cm-a">Like · Reply</div></div></div></div>`;
  }
  function screen(p) {
    const pr = prof(p.profile), I = LI_I(), isCo = pr.kind === "company";
    const top = `<div class="li-top">${avatar(prof("srinath"), 32)}<div class="li-search">${I.search}<span>Search</span></div><span class="li-ic">${I.msg}</span></div>`;
    const tabs = `<div class="li-tabs"><div class="li-tab on">${I.home}<span>Home</span></div><div class="li-tab">${I.net}<span>My Network</span></div><div class="li-tab">${I.post}<span>Post</span></div><div class="li-tab">${I.bell}<span>Notifications</span></div><div class="li-tab">${I.jobs}<span>Jobs</span></div></div>`;
    const post = `<article class="li-post">
      <div class="li-head">${avatar(pr, 48)}<div class="li-who"><div class="li-name">${esc(pr.name)}${isCo ? "" : ' <span class="li-deg">· 1st</span>'}</div><div class="li-sub">${esc(isCo ? pr.followers_line || pr.headline : pr.headline)}</div><div class="li-sub">Now · ${I.globe}</div></div><span class="li-ic">${I.more}</span><span class="li-ic">${I.x}</span></div>
      ${postText(p)}${mediaHtml(p)}
      <div class="li-actions"><span>${I.like}Like</span><span>${I.comment}Comment</span><span>${I.repost}Repost</span><span>${I.send}Send</span></div>
      ${commentHtml(p, pr)}
    </article>`;
    return `${C.statusBar()}${top}<div class="scroll li-feed">${post}</div>${tabs}${C.home()}`;
  }

  /* ---------- card = header + phone + review ---------- */
  function card(p) {
    const w = when(p), r = rv(p.key);
    const fmt = `<span class="badge fmt">${esc(p.media && p.media.type === "carousel" ? "Carousel" : p.media && p.media.type === "poll" ? "Poll" : p.media && p.media.type === "image" ? "Image" : "Post")}</span>`;
    const cta = p.cta ? `<span class="badge cta">Webinar CTA</span>` : "";
    const wip = p.status !== "ready" ? `<span class="badge wip">In production</span>` : "";
    const smp = p.sample || {};
    return `<article class="pcard card" id="${esc(p.key)}" data-id="${esc(p.key)}">
      <header class="chead"><div class="crow"><span class="pid">${esc(p.id)}</span><span class="when">${esc(w.day)} <span>· ${esc(w.time)}</span></span></div>
        <div class="crow">${fmt}${cta}${wip}</div><div class="cidea">${esc(p.idea)}</div></header>
      ${C.phone(screen(p), "linkedin")}
      <section class="rev" data-rev="${esc(p.key)}">${revHtml(p.key)}</section>
      <details class="info"><summary>Sample, template, first comment and sources</summary><dl>
        <dt>Sample matched</dt><dd><b>${esc(smp.id || "")}</b> · ${esc(smp.creator || "")}${smp.url ? ` · <a href="${esc(smp.url)}" target="_blank" rel="noopener">view original post</a>` : ""}<br>${esc(smp.what || "")}${smp.thumb ? `<img class="sthumb" src="${esc(smp.thumb)}" data-lb="${esc(smp.thumb)}" data-lb-caption="Sample ${esc(smp.id || "")}">` : ""}</dd>
        <dt>Copy template</dt><dd>${esc(p.copy_basis || "")}</dd>
        <dt>First comment</dt><dd>${p.first_comment ? `<div class="fc">${esc(p.first_comment)}</div>` : "None (not a CTA post)"}</dd>
        <dt>Sources</dt><dd>${(p.sources || []).map(esc).join("<br>")}</dd>
        ${(p.flags || []).length ? `<dt>Needs confirmation</dt><dd style="color:#a15c00">${p.flags.map(esc).join("<br>")}</dd>` : ""}
        ${(p.numbers_for_signoff || []).length ? `<dt>Numbers needing Varadha sign-off</dt><dd>${p.numbers_for_signoff.map(esc).join(" · ")}</dd>` : ""}
      </dl><div class="row"><button class="btn ghost" data-copyt="text">Copy post text</button>${p.first_comment ? '<button class="btn ghost" data-copyt="first_comment">Copy first comment</button>' : ""}</div></details>
    </article>`;
  }

  function revHtml(id) {
    const r = rv(id), cs = comments(id), me = localStorage.getItem(NAMEKEY) || "";
    const who = (x) => x ? `<small>${esc(x.name || "")}${x.name ? " · " : ""}${esc(fmtT(x.t))}</small>` : "";
    return `<div class="appr">
        <label class="ck${r.glenn ? " on" : ""}"><input type="checkbox" data-appr="glenn" ${r.glenn ? "checked" : ""}><span>Approved by Glenn${r.g ? who(r.g) : ""}</span></label>
        <label class="ck${r.team ? " on" : ""}"><input type="checkbox" data-appr="team" ${r.team ? "checked" : ""}><span>Approved by BigHammer team${r.t ? who(r.t) : ""}</span></label>
      </div>
      <div class="feed">${cs.length ? cs.map(c => `<div class="fbi"><span class="fav">${esc((c.name || "?").trim().slice(0, 1).toUpperCase())}</span><div><div class="fbh"><b>${esc(c.name || "Reviewer")}</b><span>${esc(fmtT(c.t))}</span></div><div class="fbt">${esc(c.text).replace(/\n/g, "<br>")}</div></div></div>`).join("") : `<div class="fbe">No feedback yet.</div>`}</div>
      <div class="fbin"><input data-name placeholder="Your name" value="${esc(me)}"><textarea data-fb placeholder="Add feedback on copy, design or timing..."></textarea><div class="fbrow"><span class="saved">${cs.length} ${cs.length === 1 ? "note" : "notes"}</span><button class="btn" data-addfb>Add feedback</button></div></div>`;
  }
  function refreshReviews() { document.querySelectorAll("[data-rev]").forEach(el => { const ta = el.querySelector("[data-fb]"), draft = ta ? ta.value : ""; el.innerHTML = revHtml(el.dataset.rev); if (draft) el.querySelector("[data-fb]").value = draft; }); nav(); tally(); }

  /* ---------- page ---------- */
  let filter = "all";
  function visible(p) { const r = rv(p.key); if (filter === "approved") return r.glenn && r.team; if (filter === "todo") return !(r.glenn && r.team); return true; }
  const batches = () => (S.batches && S.batches.length ? S.batches : [{ id: "2", title: "Batch 2" }]);
  const postsOf = (bid, prid) => S.posts.filter(p => (p.batch || "2") === bid && p.profile === prid).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  function render() {
    const main = document.getElementById("main");
    main.innerHTML = batches().map(bt => `<section class="batch" id="batch-${esc(bt.id)}">
      <div class="bhead"><h1>${esc(bt.title)}</h1><p>${esc(bt.dates || "")} · ${S.posts.filter(p => (p.batch || "2") === bt.id).length} posts across ${S.profiles.length} profiles</p></div>
      ${S.profiles.map((pr, i) => {
        const posts = postsOf(bt.id, pr.id);
        return `<section class="profile" id="b${esc(bt.id)}-profile-${esc(pr.id)}">
        <div class="phead">${pr.avatar_ok ? `<img class="${pr.kind === "company" ? "sq" : ""}" src="${esc(pr.avatar)}" alt="">` : ""}<div><h2>${esc(pr.name)}</h2><p>${esc(pr.headline)} · ${posts.length} posts · 10:00 ${pr.tz === "ET" ? "ET" : "UK time"}</p></div><span class="order">${i + 1} of ${S.profiles.length}</span></div>
        <div class="pgrid">${posts.length ? posts.map(card).join("") : `<div class="pnote">Posts for this profile are in production.</div>`}</div>
      </section>`; }).join("")}
    </section>`).join("");
    applyFilter();
    nav();
    if (window.LI && window.LI.afterRender) window.LI.afterRender();
    tally();
  }
  function applyFilter() { document.querySelectorAll(".pcard").forEach(el => { const p = S.posts.find(x => x.key === el.dataset.id); el.classList.toggle("hide", !visible(p)); }); }
  const openB = JSON.parse(localStorage.getItem("bh-nav-open") || "{}");
  function nav() {
    document.getElementById("sidenav").innerHTML = batches().map((bt, bi) => {
      const isOpen = openB[bt.id] !== undefined ? openB[bt.id] : bi === batches().length - 1;
      return `<details class="bnav" data-b="${esc(bt.id)}" ${isOpen ? "open" : ""}><summary>${esc(bt.title)}<small>${S.posts.filter(p => (p.batch || "2") === bt.id).length} posts</small></summary>` +
        S.profiles.map(pr => {
          const posts = postsOf(bt.id, pr.id), done = posts.filter(p => { const r = rv(p.key); return r.glenn && r.team; }).length;
          return `<a href="#b${esc(bt.id)}-profile-${esc(pr.id)}" data-target="b${esc(bt.id)}-profile-${esc(pr.id)}"><span>${esc(pr.name)}</span><small class="cnt">${done}/${posts.length}</small></a>`;
        }).join("") + `</details>`;
    }).join("") + `<h4>About</h4><a href="#how" data-target="how"><span>How review works</span></a>`;
    document.querySelectorAll(".bnav").forEach(d => d.addEventListener("toggle", () => { openB[d.dataset.b] = d.open; localStorage.setItem("bh-nav-open", JSON.stringify(openB)); }));
    const how = document.getElementById("how") || Object.assign(document.createElement("section"), { id: "how", className: "profile" });
    how.innerHTML = `<div class="phead"><div><h2>How review works</h2><p>No login needed.</p></div></div><div class="pnote" style="background:#EFE9FF;color:#3D00AD">Type your name once, then tick <b>Approved by Glenn</b> or <b>Approved by BigHammer team</b>, or add as many feedback notes as you like under any post. Each note is saved with your name and the time, and appears in that post's feed. ${SYNC ? "Everyone's notes and approvals are shared: they appear for every reviewer within a minute." : "Notes save in this browser. Press <b>Share review link</b> to send your review to someone else, who can load it into their view."} <b>Export</b> downloads every note and approval as a CSV.</div>`;
    document.getElementById("main").appendChild(how);
  }
  function tally() {
    const n = S.posts.length, g = S.posts.filter(p => rv(p.key).glenn).length, t = S.posts.filter(p => rv(p.key).team).length, b = S.posts.filter(p => rv(p.key).glenn && rv(p.key).team).length;
    const el = document.getElementById("tally"); if (el) el.innerHTML = `Glenn <b>${g}/${n}</b> · Team <b>${t}/${n}</b> · Both <b>${b}</b>`;
  }

  /* ---------- events ---------- */
  const myName = (card) => { const v = (card.querySelector("[data-name]").value || "").trim(); if (v) localStorage.setItem(NAMEKEY, v); return v; };
  document.addEventListener("change", (e) => {
    const ap = e.target.closest("[data-appr]"); if (!ap) return;
    const card = ap.closest(".pcard"), role = ap.dataset.appr;
    const name = myName(card) || (role === "glenn" ? "Glenn" : "BigHammer team");
    add({ post: card.dataset.id, kind: "approve", role, value: ap.checked, name });
    refreshReviews(); C.toast(ap.checked ? "Approval saved" : "Approval removed");
  });
  document.addEventListener("click", (e) => {
    const sv = e.target.closest("[data-addfb]");
    if (sv) {
      const card = sv.closest(".pcard"), text = card.querySelector("[data-fb]").value.trim(), name = myName(card);
      if (!name) { card.querySelector("[data-name]").focus(); C.toast("Add your name first"); return; }
      if (!text) { card.querySelector("[data-fb]").focus(); return; }
      add({ post: card.dataset.id, kind: "comment", name, text });
      card.querySelector("[data-fb]").value = ""; refreshReviews(); C.toast("Feedback saved"); return;
    }
    const ct = e.target.closest("[data-copyt]");
    if (ct) { const p = S.posts.find(x => x.key === ct.closest(".pcard").dataset.id); navigator.clipboard.writeText(p[ct.dataset.copyt] || "").then(() => C.toast("Copied")); return; }
    const f = e.target.closest("[data-filter]");
    if (f) { f.parentElement.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === f)); filter = f.dataset.filter; applyFilter(); return; }
    const poll = e.target.closest(".li-poll-o"); if (poll) { poll.parentElement.querySelectorAll(".li-poll-o").forEach(b => b.classList.toggle("voted", b === poll)); return; }
    if (e.target.id === "shareBtn") {
      const url = location.origin + location.pathname + "#r=" + enc({ v: 2, at: new Date().toISOString(), ev: EV });
      navigator.clipboard.writeText(url).then(() => C.toast("Review link copied")); return;
    }
    if (e.target.id === "exportBtn") {
      const rows = [["batch", "post", "profile", "date", "time", "kind", "name", "approval / feedback", "at"]];
      S.posts.forEach(p => EV.filter(x => x.post === p.key).forEach(x => rows.push(["Batch " + p.batch, p.id, p.profile, p.date, p.time, x.kind === "approve" ? "approval (" + x.role + ")" : "feedback", x.name, x.kind === "approve" ? (x.value ? "approved" : "unapproved") : x.text, x.t])));
      const csv = rows.map(r => r.map(x => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: "bighammer-linkedin-review.csv" }); a.click(); return;
    }
    if (e.target.id === "loadShared") { const n = merge(window.__shared.ev || []); saveEv(); (window.__shared.ev || []).forEach(push); hideBanner(); refreshReviews(); C.toast(n + " shared items loaded"); return; }
    if (e.target.id === "ignoreShared") { hideBanner(); return; }
  });
  function hideBanner() { const b = document.getElementById("banner"); b.hidden = true; history.replaceState(null, "", location.pathname + location.search); }
  function sharedBanner() {
    const m = HASH.match(/#r=([\w-]+)/); if (!m) return;
    try {
      const sh = dec(m[1]); window.__shared = sh; const ev = sh.ev || [];
      const a = ev.filter(x => x.kind === "approve").length, f = ev.filter(x => x.kind === "comment").length;
      const b = document.getElementById("banner"); b.hidden = false;
      b.innerHTML = `<span>This link carries a shared review from ${esc(fmtT(sh.at))}: <b>${a}</b> approvals and <b>${f}</b> feedback notes.</span><button class="btn" id="loadShared">Load into my view</button><button class="btn ghost" id="ignoreShared">Ignore</button>`;
    } catch { /* bad hash */ }
  }
  /* 3 phones per row by default: scale phones to fit the available width */
  let fit3 = true;
  function fit() {
    if (!fit3) return;
    const main = document.getElementById("main"); if (!main) return;
    const avail = main.clientWidth - 52, gap = 28;
    const s = Math.max(0.5, Math.min(1, (avail - 2 * gap) / (3 * 417)));
    document.documentElement.style.setProperty("--s", s.toFixed(3));
  }
  window.addEventListener("resize", fit);
  document.addEventListener("click", (e) => {
    if (e.target.closest('.seg button[data-set="scale"]')) { fit3 = false; document.getElementById("fit3").classList.remove("on"); }
    if (e.target.id === "fit3") { fit3 = true; e.target.classList.add("on"); document.querySelectorAll('.seg button[data-set="scale"]').forEach(b => b.classList.remove("on")); fit(); }
  });
  document.addEventListener("DOMContentLoaded", () => { sharedBanner(); render(); fit(); syncBadge(); pull(); if (SYNC) setInterval(pull, 45000); });
})();
