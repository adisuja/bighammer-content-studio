/* app.js: BigHammer batch-3 review studio. Renders every post inside an iPhone LinkedIn iOS feed
   (via core.js + linkedin.js) with a review layer: Glenn / BigHammer team approvals and feedback,
   persisted in localStorage and shareable as a link (#r=...). No backend. */
(function () {
  const C = window.CORE, esc = C.esc, S = window.STUDIO;
  const HASH = location.hash; // captured before core.js boot strips it
  const LI_I = () => window.LI.I;
  window.RENDER = { screen: () => "", text: () => "" }; // core.js shell needs a renderer; we render ourselves

  /* ---------- review state ---------- */
  const KEY = "bh-batch3-review-v1";
  let R = load();
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } }
  function save() { localStorage.setItem(KEY, JSON.stringify(R)); tally(); }
  const rv = (id) => (R[id] = R[id] || { glenn: false, team: false, fb: "", at: "" });
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
      const g = "car-" + p.id, n = m.files.length;
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
    const w = when(p), r = rv(p.id);
    const fmt = `<span class="badge fmt">${esc(p.media && p.media.type === "carousel" ? "Carousel" : p.media && p.media.type === "poll" ? "Poll" : p.media && p.media.type === "image" ? "Image" : "Post")}</span>`;
    const cta = p.cta ? `<span class="badge cta">Webinar CTA</span>` : "";
    const wip = p.status !== "ready" ? `<span class="badge wip">In production</span>` : "";
    const smp = p.sample || {};
    return `<article class="pcard card" id="${esc(p.id)}" data-id="${esc(p.id)}">
      <header class="chead"><div class="crow"><span class="pid">${esc(p.id)}</span><span class="when">${esc(w.day)} <span>· ${esc(w.time)}</span></span></div>
        <div class="crow">${fmt}${cta}${wip}</div><div class="cidea">${esc(p.idea)}</div></header>
      ${C.phone(screen(p), "linkedin")}
      <section class="rev">
        <div class="appr">
          <label class="ck${r.glenn ? " on" : ""}"><input type="checkbox" data-appr="glenn" ${r.glenn ? "checked" : ""}>Approved by Glenn</label>
          <label class="ck${r.team ? " on" : ""}"><input type="checkbox" data-appr="team" ${r.team ? "checked" : ""}>Approved by BigHammer team</label>
        </div>
        <textarea data-fb placeholder="Feedback on copy, design or timing...">${esc(r.fb)}</textarea>
        <div class="fbrow"><span class="saved">${r.at ? "Saved " + esc(r.at) : "Not saved yet"}</span><button class="btn" data-savefb>Save feedback</button></div>
      </section>
      <details class="info"><summary>Sample, template, first comment and sources</summary><dl>
        <dt>Sample matched</dt><dd><b>${esc(smp.id || "")}</b> · ${esc(smp.creator || "")}${smp.url ? ` · <a href="${esc(smp.url)}" target="_blank" rel="noopener">view original post</a>` : ""}<br>${esc(smp.what || "")}${smp.thumb ? `<img class="sthumb" src="${esc(smp.thumb)}" data-lb="${esc(smp.thumb)}" data-lb-caption="Sample ${esc(smp.id || "")}">` : ""}</dd>
        <dt>Copy template</dt><dd>${esc(p.copy_basis || "")}</dd>
        <dt>First comment</dt><dd>${p.first_comment ? `<div class="fc">${esc(p.first_comment)}</div>` : "None (not a CTA post)"}</dd>
        <dt>Sources</dt><dd>${(p.sources || []).map(esc).join("<br>")}</dd>
        ${(p.numbers_for_signoff || []).length ? `<dt>Numbers needing Varadha sign-off</dt><dd>${p.numbers_for_signoff.map(esc).join(" · ")}</dd>` : ""}
      </dl><div class="row"><button class="btn ghost" data-copyt="text">Copy post text</button>${p.first_comment ? '<button class="btn ghost" data-copyt="first_comment">Copy first comment</button>' : ""}</div></details>
    </article>`;
  }

  /* ---------- page ---------- */
  let filter = "all";
  function visible(p) { const r = rv(p.id); if (filter === "approved") return r.glenn && r.team; if (filter === "todo") return !(r.glenn && r.team); return true; }
  function render() {
    const main = document.getElementById("main");
    main.innerHTML = S.profiles.map((pr, i) => {
      const posts = S.posts.filter(p => p.profile === pr.id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      return `<section class="profile" id="profile-${esc(pr.id)}">
        <div class="phead">${pr.avatar_ok ? `<img class="${pr.kind === "company" ? "sq" : ""}" src="${esc(pr.avatar)}" alt="">` : ""}<div><h2>${esc(pr.name)}</h2><p>${esc(pr.headline)} · ${posts.length} posts · 10:00 ${pr.tz === "ET" ? "ET" : "UK time"}</p></div><span class="order">${i + 1} of ${S.profiles.length}</span></div>
        ${pr.note ? `<div class="pnote">${esc(pr.note)}</div>` : ""}
        <div class="pgrid">${posts.length ? posts.map(card).join("") : `<div class="pnote">Posts for this profile are in production.</div>`}</div>
      </section>`;
    }).join("");
    applyFilter();
    nav();
    if (window.LI && window.LI.afterRender) window.LI.afterRender();
    tally();
  }
  function applyFilter() { document.querySelectorAll(".pcard").forEach(el => { const p = S.posts.find(x => x.id === el.dataset.id); el.classList.toggle("hide", !visible(p)); }); }
  function nav() {
    document.getElementById("sidenav").innerHTML = S.profiles.map(pr => {
      const posts = S.posts.filter(p => p.profile === pr.id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      return `<h4>${esc(pr.name)}</h4><a href="#profile-${esc(pr.id)}" data-target="profile-${esc(pr.id)}"><span>All ${esc(pr.name)} posts</span></a>` + posts.map(p => {
        const r = rv(p.id), w = when(p);
        return `<a href="#${esc(p.id)}" data-target="${esc(p.id)}"><span>${esc(p.id)} · ${esc(p.short || p.idea)}<small>${esc(w.day)}${p.cta ? " · CTA" : ""}</small></span><span class="dots" title="Glenn · Team"><i class="${r.glenn ? "on" : ""}"></i><i class="${r.team ? "on" : ""}"></i></span></a>`;
      }).join("");
    }).join("") + `<h4>About</h4><a href="#how" data-target="how"><span>How review works</span></a>`;
    const how = document.getElementById("how") || Object.assign(document.createElement("section"), { id: "how", className: "profile" });
    how.innerHTML = `<div class="phead"><div><h2>How review works</h2><p>No login, no backend.</p></div></div><div class="pnote" style="background:#EFE9FF;color:#3D00AD">Tick <b>Approved by Glenn</b> or <b>Approved by BigHammer team</b> under any post, and type feedback and press <b>Save feedback</b>. Everything saves in this browser automatically. To share your review, press <b>Share review link</b>: it copies a link that carries your approvals and notes. Whoever opens it can load your review into their view. <b>Export</b> downloads everything as a CSV.</div>`;
    document.getElementById("main").appendChild(how);
  }
  function tally() {
    const n = S.posts.length, g = S.posts.filter(p => rv(p.id).glenn).length, t = S.posts.filter(p => rv(p.id).team).length, b = S.posts.filter(p => rv(p.id).glenn && rv(p.id).team).length;
    const el = document.getElementById("tally"); if (el) el.innerHTML = `Glenn <b>${g}/${n}</b> · Team <b>${t}/${n}</b> · Both <b>${b}</b>`;
  }

  /* ---------- events ---------- */
  document.addEventListener("change", (e) => {
    const ap = e.target.closest("[data-appr]"); if (!ap) return;
    const id = ap.closest(".pcard").dataset.id, r = rv(id);
    r[ap.dataset.appr] = ap.checked; r.at = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    ap.closest("label").classList.toggle("on", ap.checked);
    ap.closest(".pcard").querySelector(".saved").textContent = "Saved " + r.at;
    save(); nav(); C.toast("Approval saved");
  });
  document.addEventListener("click", (e) => {
    const sv = e.target.closest("[data-savefb]");
    if (sv) { const c = sv.closest(".pcard"), r = rv(c.dataset.id); r.fb = c.querySelector("[data-fb]").value.trim(); r.at = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); c.querySelector(".saved").textContent = "Saved " + r.at; save(); C.toast("Feedback saved"); return; }
    const ct = e.target.closest("[data-copyt]");
    if (ct) { const p = S.posts.find(x => x.id === ct.closest(".pcard").dataset.id); navigator.clipboard.writeText(p[ct.dataset.copyt] || "").then(() => C.toast("Copied")); return; }
    const f = e.target.closest("[data-filter]");
    if (f) { f.parentElement.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === f)); filter = f.dataset.filter; applyFilter(); return; }
    const poll = e.target.closest(".li-poll-o"); if (poll) { poll.parentElement.querySelectorAll(".li-poll-o").forEach(b => b.classList.toggle("voted", b === poll)); return; }
    if (e.target.id === "shareBtn") {
      const url = location.origin + location.pathname + "#r=" + enc({ v: 1, at: new Date().toISOString(), r: R });
      navigator.clipboard.writeText(url).then(() => C.toast("Review link copied")); return;
    }
    if (e.target.id === "exportBtn") {
      const rows = [["post", "profile", "date", "time", "glenn", "team", "feedback", "saved"]].concat(S.posts.map(p => { const r = rv(p.id); return [p.id, p.profile, p.date, p.time, r.glenn ? "yes" : "", r.team ? "yes" : "", r.fb, r.at]; }));
      const csv = rows.map(r => r.map(x => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: "bighammer-batch3-review.csv" }); a.click(); return;
    }
    if (e.target.id === "loadShared") { Object.entries(window.__shared.r || {}).forEach(([k, v]) => { const r = rv(k); r.glenn = r.glenn || v.glenn; r.team = r.team || v.team; if (v.fb && !r.fb.includes(v.fb)) r.fb = r.fb ? r.fb + "\n---\n" + v.fb : v.fb; r.at = v.at || r.at; }); save(); hideBanner(); render(); C.toast("Shared review loaded"); return; }
    if (e.target.id === "ignoreShared") { hideBanner(); return; }
  });
  function hideBanner() { const b = document.getElementById("banner"); b.hidden = true; history.replaceState(null, "", location.pathname + location.search); }
  function sharedBanner() {
    const m = HASH.match(/#r=([\w-]+)/); if (!m) return;
    try {
      const sh = dec(m[1]); window.__shared = sh;
      const vals = Object.values(sh.r || {}), a = vals.filter(v => v.glenn || v.team).length, f = vals.filter(v => v.fb).length;
      const b = document.getElementById("banner"); b.hidden = false;
      b.innerHTML = `<span>This link carries a shared review from ${esc(new Date(sh.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }))}: <b>${a}</b> posts with approvals, <b>${f}</b> with feedback.</span><button class="btn" id="loadShared">Load into my view</button><button class="btn ghost" id="ignoreShared">Ignore</button>`;
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
  document.addEventListener("DOMContentLoaded", () => { sharedBanner(); render(); fit(); });
})();
