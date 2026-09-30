/* core.js — shared shell for the BigHammer channel preview sites.
   Loads window.PREVIEW_DATA (data.js) and window.RENDER (app.js, the channel renderer).
   Grid model: campaigns → columns (steps, left → right in send order) → rows (complete paths) → cells (one screen each). */
(function () {
  let D = null, R = null;                       // filled in at boot (data.js and app.js load after core.js)
  const state = { mode: "sample", preview: true, scale: 0.85 };
  window.PREVIEW_STATE = state;

  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const URL_RE = /(https?:\/\/[^\s<]+|\b(?:[a-z0-9-]+\.)+(?:com|ai|io|net|org|co)\b(?:\/[^\s<]*)?)/gi;
  const TOK_RE = /\{\{([\w.]+)\}\}/g;

  function fill(text, mode) {
    return String(text ?? "").replace(TOK_RE, (m, k) => (mode === "sample" ? (D.tokens[k] ?? m) : m));
  }
  function linkify(html, cls) {
    return html.replace(URL_RE, (m) => {
      let trail = "";
      const t = m.match(/[.,;:!?)]+$/);
      if (t) { trail = t[0]; m = m.slice(0, -trail.length); }
      if (!m) return m + trail;
      const href = /^https?:/i.test(m) ? m : "https://" + m;
      return `<a class="${cls || "lnk"}" href="${esc(href)}" target="_blank" rel="noopener">${esc(m)}</a>${trail}`;
    });
  }
  /* Plain text → HTML with clickable links and highlighted raw tokens. Text is filled according to state.mode. */
  function rich(text, cls) {
    let html = esc(fill(text, state.mode));
    html = linkify(html, cls);
    return html.replace(TOK_RE, '<span class="tok">{{$1}}</span>');
  }
  function firstUrl(text) {
    const m = fill(text, "sample").match(URL_RE);
    if (!m) return null;
    const u = m[0].replace(/[.,;:!?)]+$/, "");
    const href = /^https?:/i.test(u) ? u : "https://" + u;
    let host; try { host = new URL(href).hostname.replace(/^www\./, ""); } catch { return null; }
    return { href, host, meta: D.previews ? D.previews[host] : null };
  }
  const words = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;
  const sample = (t) => fill(t, "sample");
  const ampm = (t) => String(t).replace(/:00 ?am/i, " AM").replace(/:00 ?pm/i, " PM").replace(/ ?am$/i, " AM").replace(/ ?pm$/i, " PM");

  const kindsHtml = (kinds) => `<div class="kinds">${(kinds || []).map(k => {
    const def = D.kinds[k] || { label: k, color: "#444" };
    return `<span class="kind" style="background:${def.color}">${esc(def.label)}</span>`;
  }).join("")}</div>`;

  const I = {
    signal: '<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx=".8"/><rect x="5" y="5.5" width="3" height="6.5" rx=".8"/><rect x="10" y="3" width="3" height="9" rx=".8"/><rect x="15" y="0" width="3" height="12" rx=".8"/></svg>',
    wifi: '<svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 11.6a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4zM3.9 7.2a6.5 6.5 0 0 1 9.2 0l-1.4 1.4a4.5 4.5 0 0 0-6.4 0zM1 4.2a10.6 10.6 0 0 1 15 0l-1.4 1.4a8.6 8.6 0 0 0-12.2 0z"/></svg>',
    battery: '<svg width="28" height="13" viewBox="0 0 28 13"><rect x=".6" y=".6" width="24" height="11.8" rx="3.4" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.2"/><rect x="2.2" y="2.2" width="20.8" height="8.6" rx="2" fill="currentColor"/><path d="M26.2 4.4v4.2a2.2 2.2 0 0 0 0-4.2z" fill="currentColor" fill-opacity=".4"/></svg>'
  };
  const statusBar = (dark) => `<div class="sb${dark ? " dark" : ""}"><span class="sb-time">10:00</span><span class="sb-icons">${I.signal}${I.wifi}${I.battery}</span></div>`;
  const phone = (inner, cls) => `<div class="phone-wrap"><div class="phone"><div class="screen ${cls || ""}">${inner}</div><div class="island"></div></div></div>`;
  const home = (dark) => `<div class="home${dark ? " dark" : ""}"></div>`;

  /* ---------- lightbox: click any image (or a carousel slide) to view it full size; ← → to move, click to zoom, Esc to close ---------- */
  const LB = { items: [], i: 0, zoom: false };
  function lbEl() {
    let el = document.getElementById("lightbox");
    if (el) return el;
    el = document.createElement("div"); el.id = "lightbox"; el.className = "lb";
    el.innerHTML = `<button class="lb-x" title="Close (Esc)">×</button><button class="lb-nav lb-prev" title="Previous (←)">‹</button><div class="lb-stage"><img alt=""><video controls playsinline style="display:none"></video></div><button class="lb-nav lb-next" title="Next (→)">›</button><div class="lb-cap"></div>`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      if (e.target.closest(".lb-x") || e.target === el) return lbClose();
      if (e.target.closest(".lb-prev")) return lbShow(LB.i - 1);
      if (e.target.closest(".lb-next")) return lbShow(LB.i + 1);
      if (e.target.tagName === "IMG") { LB.zoom = !LB.zoom; el.classList.toggle("zoom", LB.zoom); }
    });
    document.addEventListener("keydown", (e) => { if (!el.classList.contains("open")) return; if (e.key === "Escape") lbClose(); if (e.key === "ArrowLeft") lbShow(LB.i - 1); if (e.key === "ArrowRight") lbShow(LB.i + 1); });
    return el;
  }
  function lbShow(i) {
    const el = lbEl(); if (!LB.items.length) return;
    LB.i = (i + LB.items.length) % LB.items.length; LB.zoom = false; el.classList.remove("zoom");
    const it = LB.items[LB.i], img = el.querySelector("img"), vid = el.querySelector("video");
    if (it.video) { img.style.display = "none"; vid.style.display = "block"; vid.src = it.src; vid.play().catch(() => {}); }
    else { vid.pause(); vid.style.display = "none"; img.style.display = "block"; img.src = it.src; }
    el.querySelector(".lb-cap").textContent = `${it.caption || ""}${LB.items.length > 1 ? `  ·  ${LB.i + 1} / ${LB.items.length}` : ""}`;
    el.querySelectorAll(".lb-nav").forEach(b => b.style.display = LB.items.length > 1 ? "" : "none");
    el.classList.add("open");
  }
  function lbClose() { const el = lbEl(); el.classList.remove("open", "zoom"); el.querySelector("video").pause(); }
  function lightbox(items, i) { LB.items = items; lbShow(i || 0); }
  /* Any element with data-lb="<src>" opens the lightbox; siblings sharing data-lb-group inside the same card form the gallery. */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-lb]");
    if (!t) return;
    e.preventDefault();
    const scope = t.closest(".card") || document;
    const group = t.dataset.lbGroup;
    const els = group ? [...scope.querySelectorAll(`[data-lb][data-lb-group="${CSS.escape(group)}"]`)] : [t];
    lightbox(els.map(el => ({ src: el.dataset.lb, caption: el.dataset.lbCaption || el.getAttribute("alt") || "", video: el.dataset.lbVideo === "1" })), Math.max(0, els.indexOf(t)));
  });

  window.CORE = { get D() { return D; }, state, esc, fill, rich, linkify, firstUrl, words, sample, ampm, statusBar, phone, home, kindsHtml, toast, lightbox, TOK_RE, URL_RE };

  function metaLine(cell) {
    const m = R.meta ? R.meta(cell) : null;
    if (m) return m;
    const txt = sample(R.text(cell) || "");
    const parts = [`${words(txt)} words`, `${txt.length} chars`];
    if (cell.day != null) parts.push(`Day ${cell.day}`);
    if (cell.time) parts.push(ampm(cell.time));
    return parts.join(" · ");
  }

  function card(cell, col, row, c) {
    const ctx = { col, row, campaign: c };
    const screen = R.screen(cell, ctx);
    const copyable = R.text(cell);
    const copyBtn = copyable ? `<button class="copy" data-copy="${esc(cell.id)}">Copy text</button>` : "";
    const sub = cell.subtitle != null ? cell.subtitle : `${col.label} · ${col.title}`;
    return `<article class="card" id="${esc(row.id)}-${esc(col.id)}">
      <header class="card-head">${kindsHtml(cell.kinds)}<div class="card-sub">${esc(sub)}</div></header>
      ${phone(screen, R.screenClass ? R.screenClass(cell) : "")}
      <footer class="card-foot"><div class="foot-row"><div class="meta">${esc(metaLine(cell))}</div>${copyBtn}</div>${cell.footnote ? `<div class="footnote">${esc(cell.footnote)}</div>` : ""}</footer>
    </article>`;
  }

  const ST = { ok: "st ok", warn: "st warn", bad: "st bad", pending: "st warn" };
  function linkTable() {
    return `<section class="campaign linkcheck" id="links"><div class="campaign-head"><h2>Link check</h2><p>Every URL used in the copy, tested ${esc(D.linkCheckedAt)}. Links inside the phones open in a new tab.</p></div>
    <table class="ltable"><thead><tr><th>URL</th><th>Status</th><th>What we saw</th></tr></thead><tbody>${D.linkChecks.map(l =>
      `<tr><td>${/^https?:/.test(l.url) ? `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.url)}</a>` : `<span class="tok">${esc(l.url)}</span>`}</td><td><span class="${ST[l.status] || "st"}">${esc(l.label)}</span></td><td>${esc(l.note)}</td></tr>`).join("")}</tbody></table></section>`;
  }

  function render() {
    const main = document.getElementById("main");
    main.innerHTML = D.campaigns.map(c => `<section class="campaign" id="campaign-${esc(c.id)}">
      <div class="campaign-head"><div class="campaign-title"><h2>${esc(c.title)}</h2>${kindsHtml(c.kinds)}</div><p>${esc(c.subtitle || "")}</p></div>
      <div class="rail"><div class="grid" style="grid-template-columns:repeat(${c.columns.length}, calc(var(--pw) * var(--s)))">
        ${c.columns.map((col, i) => `<div class="colhead"><span class="step-num">${i + 1}</span><div><div class="step-label">${esc(col.label)} · ${esc(col.title)}</div><div class="step-day">${esc(col.day || "")}</div></div>${i < c.columns.length - 1 ? '<span class="arrow">→</span>' : ""}</div>`).join("")}
        ${c.rows.map(r => `<div class="rowhead" id="${esc(r.id)}">${esc(r.label)}</div>${r.cells.map((cell, i) => cell ? card(cell, c.columns[i], r, c) : `<div class="empty-cell"></div>`).join("")}`).join("")}
      </div></div>
    </section>`).join("") + linkTable();
    main.querySelectorAll('[data-scroll="bottom"]').forEach(b => { b.scrollTop = b.scrollHeight; });
    if (R.afterRender) R.afterRender();
    document.getElementById("sidenav").innerHTML = D.campaigns.map(c => `<h4>${esc(c.title)}</h4>` + c.rows.map(r =>
      `<a href="#${esc(r.id)}" data-target="${esc(r.id)}">${esc(r.label)}</a>`).join("")).join("")
      + `<h4>More</h4><a href="scorecard.html">Benchmark scorecard →</a><a href="#links" data-target="links">Link check</a>`;
  }

  function findCell(id) {
    for (const c of D.campaigns) for (const r of c.rows) for (const cell of r.cells) if (cell && cell.id === id) return cell;
    return null;
  }

  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-target]");
    if (nav) {
      e.preventDefault();
      const el = document.getElementById(nav.dataset.target);
      if (el) {
        goTo(el, nav.dataset.instant === "1"); delete nav.dataset.instant;
        document.querySelectorAll(".sidenav a").forEach(a => a.classList.toggle("active", a === nav));
        history.replaceState(null, "", "#" + nav.dataset.target);
      }
      return;
    }
    const cp = e.target.closest("[data-copy]");
    if (cp) {
      const cell = findCell(cp.dataset.copy);
      navigator.clipboard.writeText(fill(R.text(cell), state.mode)).then(() => toast("Copied " + (state.mode === "sample" ? "with sample data" : "with raw {{tokens}}")));
      return;
    }
    const seg = e.target.closest(".seg button");
    if (seg) {
      seg.parentElement.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === seg));
      const k = seg.dataset.set, v = seg.dataset.val;
      if (k === "scale") { state.scale = +v; applyScale(); return; }
      state[k] = v; render();
    }
  });
  function bindToggles() { document.querySelectorAll("input[data-set]").forEach(inp => inp.addEventListener("change", (e) => {
    state[e.target.dataset.set] = e.target.checked;
    document.body.classList.toggle("no-" + e.target.dataset.set, !e.target.checked);
    if (R.onToggle) R.onToggle(e.target.dataset.set, e.target.checked);
  })); }

  function goTo(el, instant) {
    const behavior = instant ? "auto" : "smooth";
    const rail = el.closest(".rail");
    if (rail) rail.scrollTo({ left: 0, behavior });
    const top = el.getBoundingClientRect().top + window.scrollY - (document.querySelector(".topbar").offsetHeight + 12);
    window.scrollTo({ top: Math.max(0, top), behavior });
  }
  let tt; function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 1600); }
  function applyScale() {
    const fit = window.innerWidth < 900 ? Math.min(state.scale, (window.innerWidth - 32) / 417) : state.scale;
    document.documentElement.style.setProperty("--s", fit.toFixed(3));
  }
  window.addEventListener("resize", applyScale);

  function boot() {
    D = window.PREVIEW_DATA; R = window.RENDER;
    Object.assign(state, D.defaultState || {});
    bindToggles();
    const initial = location.hash.slice(1);
    if (initial) history.replaceState(null, "", location.pathname + location.search);
    applyScale();
    render();
    if (initial) { const a = document.querySelector(`[data-target="${CSS.escape(initial)}"]`); if (a) { a.dataset.instant = "1"; setTimeout(() => a.click(), 60); } }
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
